"""
Finance App — Unit Tests
Covers: FeeType, StudentFee, PaymentRecord, Payroll, Paystack mock flow.
"""

from decimal import Decimal
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch

from academics.models import AcademicYear, Term, ClassLevel, SchoolClass
from accounts.models import StudentProfile
from finance.models import FeeType, StudentFee, PaymentRecord, Payroll, PayrollAuditLog

User = get_user_model()


# ────────────────────────────────────────────────────────────
#   Shared base class
# ────────────────────────────────────────────────────────────

class FinanceTestBase(APITestCase):
    """Creates the minimal academic / user structure every test needs."""

    def setUp(self):
        # Academic calendar
        self.year = AcademicYear.objects.create(
            name="2025/2026",
            start_date="2025-09-01",
            end_date="2026-07-31",
            is_current=True,
        )
        self.term = Term.objects.create(
            academic_year=self.year,
            name="3rd Term",
            start_date="2026-04-20",
            end_date="2026-07-25",
            is_current=True,
        )

        # Class level + school class
        self.level = ClassLevel.objects.create(name="Primary 1", numeric_level=1)

        # Users
        self.admin = User.objects.create_user(
            email="admin@test.com",
            username="admin_fin",
            first_name="Admin",
            last_name="User",
            role="admin",
            password="pass1234",
        )
        self.teacher = User.objects.create_user(
            email="teacher@test.com",
            username="teacher_fin",
            first_name="Teacher",
            last_name="User",
            role="teacher",
            password="pass1234",
        )
        self.student = User.objects.create_user(
            email="student@test.com",
            username="student_fin",
            first_name="Student",
            last_name="User",
            role="student",
            password="pass1234",
        )
        self.parent = User.objects.create_user(
            email="parent@test.com",
            username="parent_fin",
            first_name="Parent",
            last_name="User",
            role="parent",
            password="pass1234",
        )

        # School class
        self.school_class = SchoolClass.objects.create(
            name="Primary 1",
            level=self.level,
            teacher=self.teacher,
            academic_year=self.year,
        )

        # Link student → class → parent
        self.student_profile = StudentProfile.objects.create(
            user=self.student,
            admission_number="ADM2026FIN001",
            current_class=self.school_class,
            parent=self.parent,
        )

        # Fee type
        self.fee_type = FeeType.objects.create(
            name="Tuition Fee",
            amount=Decimal("50000.00"),
            level=self.level,
        )

        # Student fee (outstanding)
        self.student_fee = StudentFee.objects.create(
            student=self.student,
            fee_type=self.fee_type,
            term=self.term,
            status="outstanding",
            amount_paid=Decimal("0.00"),
        )


# ────────────────────────────────────────────────────────────
#   FeeType CRUD tests
# ────────────────────────────────────────────────────────────

class FeeTypeTests(FinanceTestBase):

    def setUp(self):
        super().setUp()
        self.list_url = reverse("feetype-list")
        self.detail_url = reverse("feetype-detail", kwargs={"pk": self.fee_type.id})

    def test_admin_can_create_fee_type(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self.list_url, {
            "name": "Development Levy",
            "amount": "15000.00",
            "level": str(self.level.id),
            "description": "Annual levy",
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(FeeType.objects.count(), 2)

    def test_admin_can_update_fee_type(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(self.detail_url, {"amount": "55000.00"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.fee_type.refresh_from_db()
        self.assertEqual(self.fee_type.amount, Decimal("55000.00"))

    def test_admin_can_delete_fee_type(self):
        # Create a separate fee type with no linked fees to safely delete
        ft = FeeType.objects.create(name="Transport", amount=5000, level=self.level)
        url = reverse("feetype-detail", kwargs={"pk": ft.id})
        self.client.force_authenticate(user=self.admin)
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_unauthenticated_cannot_access_fee_types(self):
        resp = self.client.get(self.list_url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


# ────────────────────────────────────────────────────────────
#   StudentFee tests
# ────────────────────────────────────────────────────────────

class StudentFeeTests(FinanceTestBase):

    def setUp(self):
        super().setUp()
        self.list_url = reverse("studentfee-list")
        self.detail_url = reverse("studentfee-detail", kwargs={"pk": self.student_fee.id})

    def test_admin_sees_all_student_fees(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(self.list_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
        ids = [str(r["id"]) for r in results]
        self.assertIn(str(self.student_fee.id), ids)

    def test_parent_only_sees_their_children_fees(self):
        # Create another unrelated student + fee
        other_student = User.objects.create_user(
            email="other@test.com", username="other_stud",
            first_name="Other", last_name="Stud", role="student", password="pass"
        )
        other_level = ClassLevel.objects.create(name="Primary 2", numeric_level=2)
        other_ft = FeeType.objects.create(name="Other Fee", amount=10000, level=other_level)
        other_term = Term.objects.create(
            academic_year=self.year, name="1st Term",
            start_date="2025-09-01", end_date="2025-12-15"
        )
        StudentFee.objects.create(
            student=other_student, fee_type=other_ft,
            term=other_term, status="outstanding"
        )

        self.client.force_authenticate(user=self.parent)
        resp = self.client.get(self.list_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
        student_ids = set(r["student"] for r in results)
        self.assertNotIn(str(other_student.id), student_ids)

    def test_bulk_assign_fee_creates_student_fees(self):
        # Create second student in same level
        student2 = User.objects.create_user(
            email="s2@test.com", username="stud2_fin",
            first_name="Second", last_name="Stud",
            role="student", password="pass"
        )
        StudentProfile.objects.create(
            user=student2, admission_number="ADM2026FIN002",
            current_class=self.school_class
        )
        url = reverse("studentfee-bulk-assign")
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(url, {
            "fee_type": str(self.fee_type.id),
            "term": str(self.term.id),
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("assigned", resp.data.get("message", "").lower())


# ────────────────────────────────────────────────────────────
#   Payment Recording tests
# ────────────────────────────────────────────────────────────

class PaymentRecordTests(FinanceTestBase):

    def setUp(self):
        super().setUp()
        self.record_url = reverse(
            "studentfee-record-payment", kwargs={"pk": self.student_fee.id}
        )

    def test_admin_can_record_cash_payment(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self.record_url, {
            "amount": "25000",
            "payment_method": "cash",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.student_fee.refresh_from_db()
        self.assertEqual(self.student_fee.amount_paid, Decimal("25000.00"))
        self.assertEqual(self.student_fee.status, "partial")

    def test_full_payment_marks_fee_as_paid(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self.record_url, {
            "amount": "50000",
            "payment_method": "transfer",
            "transaction_id": "TXN-2026-001",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.student_fee.refresh_from_db()
        self.assertEqual(self.student_fee.status, "paid")
        self.assertEqual(self.student_fee.amount_paid, Decimal("50000.00"))
        self.assertEqual(
            PaymentRecord.objects.filter(student_fee=self.student_fee).count(), 1
        )

    def test_overpayment_is_rejected(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self.record_url, {"amount": "99999"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", resp.data)

    def test_zero_amount_is_rejected(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self.record_url, {"amount": "0"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ────────────────────────────────────────────────────────────
#   Paystack mock payment flow tests
# ────────────────────────────────────────────────────────────

class PaystackMockTests(FinanceTestBase):
    """
    Tests the mock Paystack sandbox flow (no PAYSTACK_SECRET_KEY set).
    """

    def setUp(self):
        super().setUp()
        self.init_url = reverse(
            "studentfee-initialize-paystack", kwargs={"pk": self.student_fee.id}
        )
        self.verify_url = reverse("studentfee-verify-paystack")

    @patch("django.conf.settings.PAYSTACK_SECRET_KEY", "")
    def test_initialize_returns_mock_url_when_no_key(self):
        self.client.force_authenticate(user=self.parent)
        resp = self.client.post(self.init_url, {"amount": "20000"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data.get("mock"))
        self.assertIn("authorization_url", resp.data)
        self.assertIn("MOCK-", resp.data["reference"])

    @patch("django.conf.settings.PAYSTACK_SECRET_KEY", "")
    def test_initialize_rejects_already_paid_fee(self):
        self.student_fee.status = "paid"
        self.student_fee.save()
        self.client.force_authenticate(user=self.parent)
        resp = self.client.post(self.init_url, {"amount": "10000"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("django.conf.settings.PAYSTACK_SECRET_KEY", "")
    def test_verify_mock_payment_credits_student_fee(self):
        """Full mock payment journey: init → verify → fee credited."""
        self.client.force_authenticate(user=self.parent)

        # Initialize
        init_resp = self.client.post(self.init_url, {"amount": "50000"})
        self.assertEqual(init_resp.status_code, status.HTTP_200_OK)
        reference = init_resp.data["reference"]

        # Verify
        verify_resp = self.client.post(self.verify_url, {
            "reference": reference,
            "student_fee_id": str(self.student_fee.id),
            "amount": "50000",
        })
        self.assertEqual(verify_resp.status_code, status.HTTP_200_OK)
        self.student_fee.refresh_from_db()
        self.assertEqual(self.student_fee.status, "paid")
        self.assertEqual(self.student_fee.amount_paid, Decimal("50000.00"))

    @patch("django.conf.settings.PAYSTACK_SECRET_KEY", "")
    def test_verify_rejects_duplicate_reference(self):
        """Verifying an already-used reference returns a graceful response."""
        PaymentRecord.objects.create(
            student_fee=self.student_fee,
            amount=Decimal("50000"),
            payment_method="online",
            transaction_id="MOCK-dup-ref-12345",
        )
        self.client.force_authenticate(user=self.parent)
        resp = self.client.post(self.verify_url, {
            "reference": "MOCK-dup-ref-12345",
            "student_fee_id": str(self.student_fee.id),
            "amount": "50000",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("already verified", resp.data.get("message", "").lower())


# ────────────────────────────────────────────────────────────
#   Payroll calculation tests
# ────────────────────────────────────────────────────────────

class PayrollModelTests(FinanceTestBase):
    """Tests the Payroll model property calculations (no HTTP calls needed)."""

    def setUp(self):
        super().setUp()
        self.payroll = Payroll.objects.create(
            teacher=self.teacher,
            month=7,
            year=2026,
            basic_salary=Decimal("120000.00"),
            housing_allowance=Decimal("20000.00"),
            transport_allowance=Decimal("10000.00"),
            meal_allowance=Decimal("5000.00"),
            responsibility_allowance=Decimal("5000.00"),
            overtime=Decimal("0.00"),
            bonuses=Decimal("10000.00"),
            tax=Decimal("18000.00"),
            pension=Decimal("12000.00"),
            loans=Decimal("0.00"),
            other_deductions=Decimal("0.00"),
            deductions=Decimal("0.00"),
            leave_adjustment=Decimal("0.00"),
            attendance_adjustment=Decimal("0.00"),
            status="draft",
            payment_method="bank_transfer",
        )

    def test_total_allowances_calculation(self):
        expected = Decimal("20000") + Decimal("10000") + Decimal("5000") + Decimal("5000")
        self.assertEqual(self.payroll.total_allowances, expected)

    def test_gross_salary_calculation(self):
        gross = Decimal("120000") + self.payroll.total_allowances + Decimal("10000")
        self.assertEqual(self.payroll.gross_salary, gross)

    def test_net_salary_calculation(self):
        net = self.payroll.gross_salary - (Decimal("18000") + Decimal("12000"))
        self.assertEqual(self.payroll.net_salary, net)

    def test_total_deductions_calculation(self):
        expected = Decimal("18000") + Decimal("12000")
        self.assertEqual(self.payroll.total_deductions, expected)


# ────────────────────────────────────────────────────────────
#   Payroll API & status workflow tests
# ────────────────────────────────────────────────────────────

class PayrollWorkflowTests(FinanceTestBase):

    def setUp(self):
        super().setUp()
        self.payroll = Payroll.objects.create(
            teacher=self.teacher,
            month=7,
            year=2026,
            basic_salary=Decimal("100000.00"),
            tax=Decimal("15000.00"),
            pension=Decimal("10000.00"),
            status="draft",
            payment_method="bank_transfer",
        )
        self.action_url = lambda action: reverse(
            f"payroll-{action}",
            kwargs={"pk": self.payroll.id}
        )

    def test_admin_can_approve_payroll(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self.action_url("approve"))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.payroll.refresh_from_db()
        self.assertEqual(self.payroll.status, "approved")

    def test_admin_can_lock_approved_payroll(self):
        self.payroll.status = "approved"
        self.payroll.approved_by = self.admin
        self.payroll.approved_at = timezone.now()
        self.payroll.save()
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self.action_url("lock"))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.payroll.refresh_from_db()
        self.assertEqual(self.payroll.status, "locked")

    def test_teacher_cannot_approve_payroll(self):
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.post(self.action_url("approve"))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_audit_log_created_on_status_change(self):
        self.client.force_authenticate(user=self.admin)
        self.client.post(self.action_url("approve"))
        self.payroll.refresh_from_db()
        self.assertTrue(
            PayrollAuditLog.objects.filter(payroll=self.payroll).exists()
        )

    def test_generate_monthly_payroll(self):
        url = reverse("payroll-generate-monthly")
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(url, {
            "month": 8,
            "year": 2026,
            "include_admin": False,
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("message", resp.data)

    def test_teacher_can_view_own_salary(self):
        url = reverse("payroll-my-salary")
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_payroll_summary_accessible_to_admin(self):
        url = reverse("payroll-summary")
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("total_monthly_payroll", resp.data)
