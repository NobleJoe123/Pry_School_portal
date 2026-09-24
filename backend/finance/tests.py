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

    def test_student_cannot_record_payment_on_own_fee(self):
        """Students must not be able to manually mark their fees as paid."""
        self.client.force_authenticate(user=self.student)
        resp = self.client.post(self.record_url, {
            "amount": "25000",
            "payment_method": "cash",
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_parent_cannot_record_payment_on_child_fee(self):
        """Parents must not be able to manually mark cash payments on their child's fees."""
        self.client.force_authenticate(user=self.parent)
        resp = self.client.post(self.record_url, {
            "amount": "25000",
            "payment_method": "cash",
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_cannot_bulk_assign_fees(self):
        """Non-finance staff cannot bulk assign fees."""
        url = reverse("studentfee-bulk-assign")
        self.client.force_authenticate(user=self.student)
        resp = self.client.post(url, {
            "fee_type": str(self.fee_type.id),
            "term": str(self.term.id),
        })
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_idempotent_payment_recording_with_transaction_id(self):
        """Recording payment with an existing transaction_id returns existing payment gracefully."""
        self.client.force_authenticate(user=self.admin)
        resp1 = self.client.post(self.record_url, {
            "amount": "10000",
            "payment_method": "transfer",
            "transaction_id": "IDEM-REF-100",
        })
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)

        resp2 = self.client.post(self.record_url, {
            "amount": "10000",
            "payment_method": "transfer",
            "transaction_id": "IDEM-REF-100",
        })
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertIn("already recorded", resp2.data.get("message", "").lower())
        self.student_fee.refresh_from_db()
        self.assertEqual(self.student_fee.amount_paid, Decimal("10000.00"))


# ────────────────────────────────────────────────────────────
#   Paystack payment flow tests
# ────────────────────────────────────────────────────────────

class PaystackPaymentTests(FinanceTestBase):
    """
    Tests the real Paystack payment flow and error handling.
    """

    def setUp(self):
        super().setUp()
        self.init_url = reverse(
            "studentfee-initialize-paystack", kwargs={"pk": self.student_fee.id}
        )
        self.verify_url = reverse("studentfee-verify-paystack")

    @patch("django.conf.settings.PAYSTACK_SECRET_KEY", "")
    def test_initialize_returns_error_when_no_key(self):
        self.client.force_authenticate(user=self.parent)
        resp = self.client.post(self.init_url, {"amount": "20000"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not configured", resp.data.get("error", "").lower())

    @patch("django.conf.settings.PAYSTACK_SECRET_KEY", "sk_test_mock_secret_key")
    def test_initialize_rejects_already_paid_fee(self):
        self.student_fee.status = "paid"
        self.student_fee.save()
        self.client.force_authenticate(user=self.parent)
        resp = self.client.post(self.init_url, {"amount": "10000"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("django.conf.settings.PAYSTACK_SECRET_KEY", "sk_test_mock_secret_key")
    @patch("requests.post")
    def test_initialize_success_with_paystack(self, mock_post):
        mock_resp = mock_post.return_value
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": True,
            "data": {
                "authorization_url": "https://checkout.paystack.com/test-auth-url",
                "access_code": "code_123",
                "reference": "PSTK-test-ref-123"
            }
        }
        self.client.force_authenticate(user=self.parent)
        resp = self.client.post(self.init_url, {"amount": "20000"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["authorization_url"], "https://checkout.paystack.com/test-auth-url")

    @patch("django.conf.settings.PAYSTACK_SECRET_KEY", "sk_test_mock_secret_key")
    @patch("requests.get")
    def test_verify_paystack_payment_credits_student_fee(self, mock_get):
        """Verify gateway payment creates a pending PaymentRecord; fee stays outstanding until admin confirms."""
        mock_resp = mock_get.return_value
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": True,
            "data": {
                "status": "success",
                "amount": 5000000,  # 50,000 NGN in kobo
                "reference": "PSTK-real-ref-999",
                "metadata": {
                    "student_fee_id": str(self.student_fee.id),
                    "amount": 50000,
                }
            }
        }
        self.client.force_authenticate(user=self.parent)

        verify_resp = self.client.post(self.verify_url, {
            "reference": "PSTK-real-ref-999",
            "student_fee_id": str(self.student_fee.id),
        })
        self.assertEqual(verify_resp.status_code, status.HTTP_200_OK)

        # Gateway payments are pending admin confirmation — fee status must NOT change yet.
        self.student_fee.refresh_from_db()
        self.assertEqual(
            self.student_fee.status, "outstanding",
            "Fee must stay outstanding until admin confirms the gateway payment."
        )
        self.assertEqual(self.student_fee.amount_paid, Decimal("0.00"))

        # A PaymentRecord is created but marked as unconfirmed (is_confirmed=False).
        payment = PaymentRecord.objects.filter(transaction_id="PSTK-real-ref-999").first()
        self.assertIsNotNone(payment)
        self.assertEqual(payment.payment_method, "online")
        self.assertFalse(payment.is_confirmed)
        self.assertFalse(payment.is_rejected)

    @patch("django.conf.settings.PAYSTACK_SECRET_KEY", "sk_test_mock_secret_key")
    def test_verify_rejects_duplicate_reference(self):
        """Verifying an already-used reference returns a graceful response."""
        PaymentRecord.objects.create(
            student_fee=self.student_fee,
            amount=Decimal("50000"),
            payment_method="online",
            transaction_id="PSTK-dup-ref-12345",
        )
        self.client.force_authenticate(user=self.parent)
        resp = self.client.post(self.verify_url, {
            "reference": "PSTK-dup-ref-12345",
            "student_fee_id": str(self.student_fee.id),
            "amount": "50000",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("already verified", resp.data.get("message", "").lower())

    def test_payment_record_role_scoping(self):
        """Verify payment records list is scoped to parent's children."""
        PaymentRecord.objects.create(
            student_fee=self.student_fee,
            amount=Decimal("10000"),
            payment_method="transfer",
            transaction_id="TXN-PARENT-1",
        )
        url = reverse("paymentrecord-list")
        self.client.force_authenticate(user=self.parent)
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data if isinstance(resp.data, list) else resp.data.get("results", [])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["transaction_id"], "TXN-PARENT-1")
        self.assertIn("receipt_number", results[0])


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


# ────────────────────────────────────────────────────────────
#   Security: initialize_paystack allow-list
# ────────────────────────────────────────────────────────────

class InitializePaystackAuthTests(FinanceTestBase):
    """
    Ensures only the fee's own student, their linked parent, or finance staff
    can initiate a Paystack checkout — no other role can slip through.
    """

    def setUp(self):
        super().setUp()
        self.init_url = reverse(
            "studentfee-initialize-paystack", kwargs={"pk": self.student_fee.id}
        )

    @patch("django.conf.settings.PAYSTACK_SECRET_KEY", "sk_test_mock")
    def test_teacher_cannot_initialize_payment_for_any_student(self):
        """A teacher must receive 403 — even though they are authenticated."""
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.post(self.init_url, {"amount": "20000"})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    @patch("django.conf.settings.PAYSTACK_SECRET_KEY", "sk_test_mock")
    def test_unrelated_parent_cannot_initialize_another_childs_fee(self):
        """A parent cannot initiate payment for a student who is not their child."""
        other_parent = User.objects.create_user(
            email="other_parent@test.com",
            username="other_parent",
            first_name="Other",
            last_name="Parent",
            role="parent",
            password="pass1234",
        )
        self.client.force_authenticate(user=other_parent)
        resp = self.client.post(self.init_url, {"amount": "20000"})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    @patch("django.conf.settings.PAYSTACK_SECRET_KEY", "sk_test_mock")
    def test_student_cannot_initialize_another_students_fee(self):
        """A student cannot initiate payment for another student's fee."""
        other_student = User.objects.create_user(
            email="other_s@test.com",
            username="other_stud2",
            first_name="Other",
            last_name="Student",
            role="student",
            password="pass1234",
        )
        self.client.force_authenticate(user=other_student)
        resp = self.client.post(self.init_url, {"amount": "20000"})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


# ────────────────────────────────────────────────────────────
#   Payment confirmation / rejection lifecycle
# ────────────────────────────────────────────────────────────

class PaymentRejectionTests(FinanceTestBase):
    """Tests the reject_payment action and its new explicit field tracking."""

    def setUp(self):
        super().setUp()
        # Create a pending (unconfirmed) payment record as if from Paystack
        self.pending_payment = PaymentRecord.objects.create(
            student_fee=self.student_fee,
            amount=Decimal("20000.00"),
            payment_method="online",
            transaction_id="PSTK-PENDING-001",
            is_confirmed=False,
        )
        self.reject_url = reverse(
            "paymentrecord-reject-payment", kwargs={"pk": self.pending_payment.id}
        )
        self.confirm_url = reverse(
            "paymentrecord-confirm-payment", kwargs={"pk": self.pending_payment.id}
        )

    def test_reject_payment_sets_is_rejected_flag(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self.reject_url, {"reason": "Screenshot did not match."})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.pending_payment.refresh_from_db()
        self.assertTrue(self.pending_payment.is_rejected)
        self.assertIsNotNone(self.pending_payment.rejected_by)
        self.assertIsNotNone(self.pending_payment.rejected_at)
        self.assertIn("REJECTED", self.pending_payment.notes)

    def test_reject_payment_requires_reason(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self.reject_url, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_reject_already_rejected_payment(self):
        self.pending_payment.is_rejected = True
        self.pending_payment.save()
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self.reject_url, {"reason": "Duplicate"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_confirm_already_rejected_payment(self):
        self.pending_payment.is_rejected = True
        self.pending_payment.save()
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(self.confirm_url, {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_payment_status_field_in_serializer(self):
        """PaymentRecordSerializer returns a correct payment_status string."""
        from finance.serializers import PaymentRecordSerializer
        serialized = PaymentRecordSerializer(self.pending_payment).data
        self.assertEqual(serialized["payment_status"], "pending")

        self.pending_payment.is_rejected = True
        self.pending_payment.save()
        serialized = PaymentRecordSerializer(self.pending_payment).data
        self.assertEqual(serialized["payment_status"], "rejected")


# ────────────────────────────────────────────────────────────
#   Student Directory (pupil billing overview + parent_linked)
# ────────────────────────────────────────────────────────────

class StudentDirectoryTests(FinanceTestBase):
    """
    Tests the /finance/student-fees/student_directory/ endpoint.
    Validates billing_status derivation and parent_linked flag.
    """

    def setUp(self):
        super().setUp()
        self.url = reverse("studentfee-student-directory")

    def test_admin_can_access_student_directory(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsInstance(resp.data, list)

    def test_teacher_cannot_access_student_directory(self):
        self.client.force_authenticate(user=self.teacher)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_parent_linked_is_true_for_student_with_parent(self):
        """Our fixture student has a parent linked."""
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        entry = next((r for r in resp.data if r["id"] == str(self.student.id)), None)
        self.assertIsNotNone(entry)
        self.assertTrue(entry["parent_linked"])
        self.assertEqual(entry["parent_name"], self.parent.full_name)

    def test_parent_linked_is_false_for_student_without_parent(self):
        """A student with no parent linked must have parent_linked=False."""
        orphan_student = User.objects.create_user(
            email="orphan@test.com",
            username="orphan_stud",
            first_name="Orphan",
            last_name="Student",
            role="student",
            password="pass1234",
        )
        from accounts.models import StudentProfile as SP
        SP.objects.create(
            user=orphan_student,
            admission_number="ADM-ORPHAN-001",
            current_class=self.school_class,
            parent=None,
        )
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(self.url)
        entry = next((r for r in resp.data if r["id"] == str(orphan_student.id)), None)
        self.assertIsNotNone(entry)
        self.assertFalse(entry["parent_linked"])
        self.assertIsNone(entry["parent_name"])

    def test_unbilled_student_has_correct_billing_status(self):
        """A student with no StudentFee in the current term is 'unbilled'."""
        unbilled = User.objects.create_user(
            email="unbilled@test.com",
            username="unbilled_stud",
            first_name="Unbilled",
            last_name="Student",
            role="student",
            password="pass1234",
        )
        from accounts.models import StudentProfile as SP
        SP.objects.create(
            user=unbilled,
            admission_number="ADM-UNBILLED-001",
            current_class=self.school_class,
        )
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(self.url, {"term": str(self.term.id)})
        entry = next((r for r in resp.data if r["id"] == str(unbilled.id)), None)
        self.assertIsNotNone(entry)
        self.assertEqual(entry["billing_status"], "unbilled")
        self.assertEqual(entry["fee_count"], 0)

    def test_billing_status_filter(self):
        """?billing_status=unbilled should exclude fully-billed students."""
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(self.url, {
            "term": str(self.term.id),
            "billing_status": "outstanding",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for entry in resp.data:
            self.assertEqual(entry["billing_status"], "outstanding")

    def test_parent_linked_filter(self):
        """?parent_linked=false returns only students with no parent linked."""
        orphan_student = User.objects.create_user(
            email="orphan2@test.com",
            username="orphan_stud2",
            first_name="Orphan2",
            last_name="Student",
            role="student",
            password="pass1234",
        )
        from accounts.models import StudentProfile as SP
        SP.objects.create(
            user=orphan_student,
            admission_number="ADM-ORPHAN-002",
            current_class=self.school_class,
            parent=None,
        )
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get(self.url, {"parent_linked": "false"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        for entry in resp.data:
            self.assertFalse(entry["parent_linked"])
