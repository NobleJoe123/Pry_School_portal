import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from academics.models import Term, ClassLevel

class FeeType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE, related_name='fees')

    def __str__(self):
        return f"{self.name} - {self.amount}"

class StudentFee(models.Model):
    STATUS_CHOICES = [
        ('paid', 'Fully Paid'),
        ('partial', 'Partially Paid'),
        ('outstanding', 'Outstanding'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        limit_choices_to={'role': 'student'},
        related_name='assigned_fees'
    )
    fee_type = models.ForeignKey(FeeType, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='outstanding')
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    @property
    def balance(self):
        return self.fee_type.amount - self.amount_paid

    def apply_payment(self, amount, payment_method, transaction_id=None, received_by=None, actor=None, is_confirmed=True):
        """
        Thread-safe method to apply a payment to this StudentFee using row-locking.
        Updates amount_paid, status, and creates a PaymentRecord atomically.

        Args:
            is_confirmed: True for manual payments recorded by admin staff (cash/transfer/card).
                          False for parent-initiated gateway payments pending admin review.
        """
        from decimal import Decimal
        from django.db import transaction
        import logging
        logger = logging.getLogger(__name__)

        amount_decimal = Decimal(str(amount))
        if amount_decimal <= Decimal('0'):
            raise ValueError("Payment amount must be greater than zero.")

        with transaction.atomic():
            locked_fee = StudentFee.objects.select_for_update().get(id=self.id)
            if locked_fee.status == 'paid':
                raise ValueError("Fee is already fully paid.")

            if amount_decimal > locked_fee.balance:
                raise ValueError(f"Amount ₦{amount_decimal:,.2f} exceeds outstanding balance of ₦{locked_fee.balance:,.2f}.")

            payment = PaymentRecord.objects.create(
                student_fee=locked_fee,
                amount=amount_decimal,
                payment_method=payment_method,
                transaction_id=transaction_id,
                received_by=received_by,
                is_confirmed=is_confirmed,
                confirmed_by=received_by if is_confirmed else None,
            )

            # Only credit the fee balance if payment is confirmed
            if is_confirmed:
                locked_fee.amount_paid += amount_decimal
                if locked_fee.amount_paid >= locked_fee.fee_type.amount:
                    locked_fee.status = 'paid'
                elif locked_fee.amount_paid > Decimal('0'):
                    locked_fee.status = 'partial'
                locked_fee.save()

                self.amount_paid = locked_fee.amount_paid
                self.status = locked_fee.status

        # Send notifications with robust logging
        try:
            from accounts.models import Notification
            student = self.student
            fee_name = self.fee_type.name
            parent = getattr(getattr(student, 'student_profile', None), 'parent', None)

            if is_confirmed:
                msg = (
                    f"A payment of ₦{amount_decimal:,.2f} ({payment.get_payment_method_display()}) "
                    f"was recorded for {student.full_name}'s {fee_name}. New status: {self.get_status_display()}."
                )
                if transaction_id:
                    msg += f" Ref: {transaction_id}."
                student_msg = f"A payment of ₦{amount_decimal:,.2f} was recorded for your {fee_name}."
            else:
                msg = (
                    f"An online payment of ₦{amount_decimal:,.2f} for {student.full_name}'s {fee_name} "
                    f"is pending admin confirmation. Ref: {transaction_id or 'N/A'}."
                )
                student_msg = f"Your payment of ₦{amount_decimal:,.2f} for {fee_name} is pending admin confirmation."

            sender_user = actor or received_by
            if parent:
                Notification.objects.create(
                    sender=sender_user,
                    recipient=parent,
                    title="Fee Payment Recorded" if is_confirmed else "Payment Pending Confirmation",
                    message=msg,
                    category='finance',
                    audience='selected'
                )
            Notification.objects.create(
                sender=sender_user,
                recipient=student,
                title="Fee Payment Recorded" if is_confirmed else "Payment Pending Confirmation",
                message=student_msg,
                category='finance',
                audience='selected'
            )
        except Exception as e:
            logger.warning(f"Error dispatching payment notification for fee {self.id}: {e}")

        return payment

    class Meta:
        unique_together = ('student', 'fee_type', 'term')
        ordering = ['student', 'term']

    def __str__(self):
        return f"{self.student.full_name} - {self.fee_type.name} ({self.status})"

class PaymentRecord(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('transfer', 'Bank Transfer'),
        ('card', 'Card Payment'),
        ('online', 'Online Gateway'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student_fee = models.ForeignKey(StudentFee, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    date = models.DateTimeField(default=timezone.now)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='received_payments',
        limit_choices_to={'role__in': ['admin', 'teacher']}
    )
    # Admin confirmation fields
    is_confirmed = models.BooleanField(
        default=True,
        help_text='True for manually recorded payments; False for gateway payments awaiting admin review.'
    )
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='confirmed_payments',
        limit_choices_to={'role': 'admin'}
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)
    # Rejection tracking
    is_rejected = models.BooleanField(
        default=False,
        help_text='True when an admin has explicitly rejected this gateway payment.'
    )
    rejected_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rejected_payments',
        limit_choices_to={'role': 'admin'}
    )
    rejected_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True, help_text='Admin notes for confirmation or rejection reason.')

    def __str__(self):
        if self.is_rejected:
            label = 'rejected'
        elif self.is_confirmed:
            label = 'confirmed'
        else:
            label = 'pending'
        return f"Payment of {self.amount} for {self.student_fee.student.full_name} ({label})"

class Payroll(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('preview', 'Preview'),
        ('approved', 'Approved'),
        ('locked', 'Locked'),
        ('processing', 'Processing'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('reversed', 'Reversed'),
        ('cancelled', 'Cancelled'),
    ]

    PAYMENT_SCHEDULE_CHOICES = [
        ('monthly', 'Monthly'),
        ('bi_weekly', 'Bi-weekly'),
        ('weekly', 'Weekly'),
        ('contract', 'Contract-Based'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('bank_transfer', 'Bank Transfer'),
        ('cash', 'Cash'),
        ('cheque', 'Cheque'),
        ('gateway', 'Payment Gateway'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        limit_choices_to={'role__in': ['teacher', 'admin']},
        related_name='payrolls'
    )
    month = models.IntegerField()
    year = models.IntegerField()
    department = models.CharField(max_length=120, blank=True, null=True)
    salary_grade = models.CharField(max_length=60, blank=True, null=True)
    payment_schedule = models.CharField(max_length=20, choices=PAYMENT_SCHEDULE_CHOICES, default='monthly')
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    housing_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    transport_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    meal_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    responsibility_allowance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    overtime = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bonuses = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pension = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    loans = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    other_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    leave_adjustment = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    attendance_adjustment = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    due_date = models.DateField(blank=True, null=True)
    payment_date = models.DateField(blank=True, null=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='bank_transfer')
    payment_reference = models.CharField(max_length=100, blank=True, null=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_payrolls',
        limit_choices_to={'role': 'admin'},
    )
    approved_at = models.DateTimeField(blank=True, null=True)
    locked_at = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def total_allowances(self):
        return (
            self.housing_allowance +
            self.transport_allowance +
            self.meal_allowance +
            self.responsibility_allowance +
            self.overtime
        )

    @property
    def total_bonuses(self):
        return self.bonuses

    @property
    def total_deductions(self):
        return (
            self.tax +
            self.pension +
            self.loans +
            self.other_deductions +
            self.deductions +
            self.leave_adjustment +
            self.attendance_adjustment
        )

    @property
    def gross_salary(self):
        return self.basic_salary + self.total_allowances + self.total_bonuses

    @property
    def net_salary(self):
        return self.gross_salary - self.total_deductions

    class Meta:
        unique_together = ('teacher', 'month', 'year')
        indexes = [
            models.Index(fields=['year', 'month']),
            models.Index(fields=['status']),
            models.Index(fields=['payment_date']),
        ]

    def __str__(self):
        return f"Payroll: {self.teacher.full_name} ({self.month}/{self.year})"


class PayrollAuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payroll = models.ForeignKey(Payroll, on_delete=models.CASCADE, related_name='audit_logs')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=80)
    previous_value = models.JSONField(blank=True, null=True)
    updated_value = models.JSONField(blank=True, null=True)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['action']),
            models.Index(fields=['timestamp']),
        ]

    def __str__(self):
        return f"{self.action} - {self.payroll}"
