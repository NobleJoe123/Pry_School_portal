import logging
from decimal import Decimal
from django.db import transaction

logger = logging.getLogger(__name__)


def bill_student_for_active_term(student, term=None, actor=None):
    """
    Ensures an enrolled student is billed for all FeeTypes configured for their class level
    in the active term (or specified term). Dispatches notifications to the student and linked parent.
    Returns the number of new StudentFee records created.
    """
    from academics.models import Term
    from finance.models import FeeType, StudentFee
    from accounts.models import Notification

    if term is None:
        term = Term.objects.filter(is_current=True).first()
    if not term:
        logger.warning(f"Cannot bill student {student.id}: No active term found.")
        return 0

    profile = getattr(student, 'student_profile', None)
    if not profile or not profile.current_class or not getattr(profile.current_class, 'level', None):
        logger.info(f"Student {student.id} has no assigned class/level; skipping auto-billing.")
        return 0

    level = profile.current_class.level
    fee_types = FeeType.objects.filter(level=level)
    if not fee_types.exists():
        logger.info(f"No fee types configured for class level {level.name}; skipping.")
        return 0

    created_count = 0
    notifications = []
    parent = getattr(profile, 'parent', None)

    with transaction.atomic():
        for ft in fee_types:
            sf, created = StudentFee.objects.get_or_create(
                student=student,
                fee_type=ft,
                term=term,
                defaults={'status': 'outstanding', 'amount_paid': Decimal('0.00')}
            )
            if created:
                created_count += 1
                if parent:
                    notifications.append(
                        Notification(
                            sender=actor,
                            recipient=parent,
                            title=f"Tuition Invoice: {student.first_name}",
                            message=f"School fees for {term.name} ({ft.name} - ₦{ft.amount:,.2f}) have been billed for your child, {student.full_name}.",
                            category='finance',
                            audience='selected'
                        )
                    )
                notifications.append(
                    Notification(
                        sender=actor,
                        recipient=student,
                        title=f"New Fee: {ft.name}",
                        message=f"A new fee of ₦{ft.amount:,.2f} for {ft.name} has been assigned for {term.name}.",
                        category='finance',
                        audience='selected'
                    )
                )

        if notifications:
            Notification.objects.bulk_create(notifications)

    return created_count


def bill_enrolled_students_for_term(term, actor=None):
    """
    Auto-generate school fees for all active enrolled students for the given term.
    Dispatches notifications to parents and returns count of created fees.
    """
    from accounts.models import User

    active_students = User.objects.filter(
        role='student',
        is_active=True,
        student_profile__current_class__isnull=False
    ).select_related('student_profile__current_class__level', 'student_profile__parent')

    total_created = 0
    for student in active_students:
        total_created += bill_student_for_active_term(student, term=term, actor=actor)

    return total_created
