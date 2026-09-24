"""
Management command: fix_orphaned_fees
--------------------------------------
Diagnoses and optionally cleans up data-quality gaps in the StudentFee table:

1. ORPHANED FEES – StudentFee rows where the student user has no StudentProfile.
   These arise when a student account is deleted before its profile is removed,
   or when student_profile.parent migration rolled back mid-flight.

2. NO-PARENT PUPILS – Students who have a StudentProfile but whose parent FK is NULL.
   These students will never appear in their parent's portal view even if they have
   fees assigned. This report lets admins link them manually.

Usage:
    # Dry-run (report only, no changes)
    python manage.py fix_orphaned_fees

    # Actually delete orphaned fees (irreversible – confirm interactively)
    python manage.py fix_orphaned_fees --delete-orphans
"""

import logging
from django.core.management.base import BaseCommand
from django.db import transaction

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = (
        "Diagnose (and optionally delete) orphaned StudentFee rows, "
        "and report pupils with no linked parent account."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete-orphans',
            action='store_true',
            default=False,
            help='Delete StudentFee rows whose student has no StudentProfile. '
                 'You will be asked to confirm before deletion proceeds.',
        )

    def handle(self, *args, **options):
        from finance.models import StudentFee
        from accounts.models import StudentProfile

        self.stdout.write(self.style.MIGRATE_HEADING("\n=== StudentFee Data Quality Report ===\n"))

        # ── 1. Orphaned fees ──────────────────────────────────────────────────
        all_fees = StudentFee.objects.select_related('student', 'fee_type', 'term')
        orphaned = [
            sf for sf in all_fees
            if not hasattr(sf.student, 'student_profile') or sf.student.student_profile is None
        ]

        if orphaned:
            self.stdout.write(self.style.WARNING(
                f"\n[!] ORPHANED FEES ({len(orphaned)} row(s)) — "
                "student has no StudentProfile:\n"
            ))
            for sf in orphaned:
                self.stdout.write(
                    f"    StudentFee.id={sf.id}  "
                    f"student={sf.student.email}  "
                    f"fee={sf.fee_type.name}  "
                    f"term={sf.term.name}  "
                    f"status={sf.status}"
                )
        else:
            self.stdout.write(self.style.SUCCESS("\n[✓] No orphaned fees found.\n"))

        # ── 2. No-parent pupils ───────────────────────────────────────────────
        no_parent = StudentProfile.objects.select_related('user').filter(parent__isnull=True)
        if no_parent.exists():
            self.stdout.write(self.style.WARNING(
                f"\n[!] PUPILS WITH NO PARENT LINKED ({no_parent.count()} row(s)):\n"
            ))
            for sp in no_parent:
                # Count their outstanding fees
                outstanding = StudentFee.objects.filter(
                    student=sp.user,
                    status__in=['outstanding', 'partial']
                ).count()
                self.stdout.write(
                    f"    student={sp.user.email}  "
                    f"admission={sp.admission_number}  "
                    f"outstanding_fees={outstanding}"
                )
            self.stdout.write(
                "\n    ACTION REQUIRED: Link each pupil to their parent via the Django admin "
                "or the portal's parent-management UI (Accounts → Parents → Assign Children).\n"
            )
        else:
            self.stdout.write(self.style.SUCCESS("\n[✓] All pupils have a linked parent account.\n"))

        # ── 3. Optionally delete orphans ──────────────────────────────────────
        if options['delete_orphans'] and orphaned:
            self.stdout.write(self.style.WARNING(
                f"\nYou are about to DELETE {len(orphaned)} orphaned StudentFee rows. "
                "This is IRREVERSIBLE.\n"
            ))
            confirm = input("Type 'yes' to confirm: ").strip().lower()
            if confirm != 'yes':
                self.stdout.write(self.style.NOTICE("Aborted — no rows were deleted."))
                return

            ids = [sf.id for sf in orphaned]
            with transaction.atomic():
                deleted, _ = StudentFee.objects.filter(id__in=ids).delete()
            self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} orphaned StudentFee row(s)."))
            logger.info("fix_orphaned_fees: deleted %d orphaned StudentFee rows", deleted)
        elif options['delete_orphans'] and not orphaned:
            self.stdout.write(self.style.SUCCESS("Nothing to delete — no orphaned fees.\n"))
        elif orphaned:
            self.stdout.write(self.style.NOTICE(
                "\nDry-run complete. Run with --delete-orphans to remove the rows above.\n"
            ))

        self.stdout.write(self.style.MIGRATE_HEADING("=== End of Report ===\n"))
