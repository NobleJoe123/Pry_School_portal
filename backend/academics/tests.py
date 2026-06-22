from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from academics.models import AcademicYear, Term, ReportCard

User = get_user_model()

class ReportCardTests(APITestCase):
    def setUp(self):
        from academics.models import ClassLevel, SchoolClass
        from accounts.models import StudentProfile

        # Create academic year and term
        self.year = AcademicYear.objects.create(
            name="2025/2026",
            start_date="2025-09-01",
            end_date="2026-07-20",
            is_current=True
        )
        self.term = Term.objects.create(
            academic_year=self.year,
            name="1st Term",
            start_date="2025-09-01",
            end_date="2025-12-15",
            is_current=True
        )

        # Create users
        self.admin = User.objects.create_user(
            email="admin@test.com",
            username="adminuser",
            first_name="Admin",
            last_name="User",
            role="admin",
            password="securepassword123"
        )
        self.teacher = User.objects.create_user(
            email="teacher@test.com",
            username="teacheruser",
            first_name="Teacher",
            last_name="User",
            role="teacher",
            password="securepassword123"
        )
        self.student = User.objects.create_user(
            email="student@test.com",
            username="studentuser",
            first_name="Student",
            last_name="User",
            role="student",
            password="securepassword123"
        )

        # Create academic structure
        self.level = ClassLevel.objects.create(name="Primary 1", numeric_level=1)
        self.school_class = SchoolClass.objects.create(
            name="Primary 1A",
            level=self.level,
            teacher=self.teacher,
            academic_year=self.year
        )

        # Create StudentProfile linking student to current_class
        self.student_profile = StudentProfile.objects.create(
            user=self.student,
            admission_number="ADM2026001",
            current_class=self.school_class
        )

        # Create base report card
        self.report_card = ReportCard.objects.create(
            student=self.student,
            term=self.term,
            teacher_remarks="Initial teacher remark",
            admin_remarks="Initial admin remark",
            is_published=False
        )

        self.list_url = reverse('reportcard-list')
        self.detail_url = reverse('reportcard-detail', kwargs={'pk': self.report_card.id})
        self.bulk_url = reverse('reportcard-bulk-comment-and-publish')

    def test_teacher_can_edit_teacher_remarks_only(self):
        self.client.force_authenticate(user=self.teacher)
        
        # Try to modify teacher_remarks (should succeed)
        response = self.client.patch(self.detail_url, {'teacher_remarks': 'Updated teacher remark'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.report_card.refresh_from_db()
        self.assertEqual(self.report_card.teacher_remarks, 'Updated teacher remark')

        # Try to modify admin_remarks (should fail)
        response = self.client.patch(self.detail_url, {'admin_remarks': 'Malicious admin remark'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('admin_remarks', response.data)

        # Try to publish (should fail)
        response = self.client.patch(self.detail_url, {'is_published': True})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('is_published', response.data)

    def test_admin_can_edit_all_fields(self):
        self.client.force_authenticate(user=self.admin)
        
        data = {
            'teacher_remarks': 'Admin changing teacher remark',
            'admin_remarks': 'Approved by Admin',
            'is_published': True
        }
        response = self.client.patch(self.detail_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.report_card.refresh_from_db()
        self.assertEqual(self.report_card.teacher_remarks, 'Admin changing teacher remark')
        self.assertEqual(self.report_card.admin_remarks, 'Approved by Admin')
        self.assertTrue(self.report_card.is_published)

    def test_admin_bulk_comment_and_publish(self):
        self.client.force_authenticate(user=self.admin)
        
        payload = {
            'term': str(self.term.id),
            'records': [
                {
                    'student_id': str(self.student.id),
                    'admin_remarks': 'Excellent student!',
                    'is_published': True
                }
            ]
        }
        
        response = self.client.post(self.bulk_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.report_card.refresh_from_db()
        self.assertEqual(self.report_card.admin_remarks, 'Excellent student!')
        self.assertTrue(self.report_card.is_published)
