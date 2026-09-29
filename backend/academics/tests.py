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

    def test_parent_score_visibility_requires_admin_publishing(self):
        from academics.models import Subject, AssessmentType, Assessment, StudentScore
        from accounts.models import ParentProfile

        # Setup Parent and link student
        parent_user = User.objects.create_user(
            email="parent@test.com",
            username="parentuser",
            role="parent",
            password="securepassword123"
        )
        ParentProfile.objects.create(user=parent_user)
        self.student_profile.parent = parent_user
        self.student_profile.save()

        # Create Subject, Assessment, Score
        subj = Subject.objects.create(name="Mathematics", code="MATH1", level=self.level)
        ass_type = AssessmentType.objects.create(name="CA 1", max_score=40, weight=40)
        assessment = Assessment.objects.create(
            name="Math CA",
            assessment_type=ass_type,
            school_class=self.school_class,
            subject=subj,
            term=self.term
        )
        score = StudentScore.objects.create(student=self.student, assessment=assessment, score_obtained=35)

        # Authenticate as Parent
        self.client.force_authenticate(user=parent_user)
        scores_url = reverse('studentscore-list')

        # Before ReportCard publication, score should NOT be returned to parent
        self.report_card.is_published = False
        self.report_card.save()
        res_unpublished = self.client.get(scores_url)
        self.assertEqual(res_unpublished.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_unpublished.data.get('results', res_unpublished.data)), 0)

        # After ReportCard is published by Admin, score SHOULD be visible to parent
        self.report_card.is_published = True
        self.report_card.save()
        res_published = self.client.get(scores_url)
        self.assertEqual(res_published.status_code, status.HTTP_200_OK)
        results = res_published.data.get('results', res_published.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], str(score.id))

    def test_transition_vacation_sends_notification_with_next_term_resumption(self):
        from accounts.models import Notification
        
        # Create second term
        term2 = Term.objects.create(
            academic_year=self.year,
            name="2nd Term",
            start_date="2026-01-10",
            end_date="2026-04-10",
            resumption_date="2026-01-10",
            is_current=False
        )

        self.client.force_authenticate(user=self.admin)
        vacation_url = reverse('term-transition-vacation', kwargs={'pk': self.term.id})
        res = self.client.post(vacation_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Verify notification was sent containing next term resumption message
        notif = Notification.objects.filter(title__icontains="Vacation Period").first()
        self.assertIsNotNone(notif)
        self.assertIn("next term begins on", notif.message.lower())


class AcademicSessionTests(APITestCase):
    def setUp(self):
        from academics.models import ClassLevel, SchoolClass
        from accounts.models import StudentProfile
        from finance.models import FeeType

        self.admin = User.objects.create_user(
            email="admin_sess@test.com", username="adminsess", first_name="Admin", last_name="Sess", role="admin", password="password"
        )
        self.teacher = User.objects.create_user(
            email="teacher_sess@test.com", username="teachersess", first_name="Teach", last_name="Sess", role="teacher", password="password"
        )
        self.parent = User.objects.create_user(
            email="parent_sess@test.com", username="parentsess", first_name="Par", last_name="Sess", role="parent", password="password"
        )
        self.student = User.objects.create_user(
            email="pupil_sess@test.com", username="pupilsess", first_name="Pupil", last_name="Sess", role="student", password="password"
        )

        self.year1 = AcademicYear.objects.create(name="2025/2026", start_date="2025-09-01", end_date="2026-07-20", is_current=True)
        self.term1 = Term.objects.create(academic_year=self.year1, name="1st Term", start_date="2025-09-01", end_date="2025-12-15", is_current=True)

        self.year2 = AcademicYear.objects.create(name="2026/2027", start_date="2026-09-01", end_date="2027-07-20", is_current=False)
        self.term2_1 = Term.objects.create(academic_year=self.year2, name="1st Term", start_date="2026-09-01", end_date="2026-12-15", is_current=False)

        self.level = ClassLevel.objects.create(name="Basic 1", numeric_level=1)
        self.school_class = SchoolClass.objects.create(name="Basic 1A", level=self.level, academic_year=self.year1)
        self.student_profile = StudentProfile.objects.create(user=self.student, admission_number="ADM-SESS-1", current_class=self.school_class, parent=self.parent)

        self.fee_type = FeeType.objects.create(name="Tuition Fee", amount=35000.00, level=self.level)

    def test_activate_session_sets_active_session_and_term(self):
        from finance.models import StudentFee

        self.client.force_authenticate(user=self.admin)
        url = reverse('academicyear-set-current', kwargs={'pk': self.year2.id})
        res = self.client.post(url, {'resumption_date': '2026-09-15'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.year1.refresh_from_db()
        self.year2.refresh_from_db()
        self.term1.refresh_from_db()
        self.term2_1.refresh_from_db()

        self.assertFalse(self.year1.is_current)
        self.assertTrue(self.year2.is_current)
        self.assertFalse(self.term1.is_current)
        self.assertTrue(self.term2_1.is_current)
        self.assertEqual(str(self.term2_1.resumption_date), '2026-09-15')

        # Check fee auto-generation
        sf = StudentFee.objects.filter(student=self.student, term=self.term2_1).first()
        self.assertIsNotNone(sf)
        self.assertEqual(sf.fee_type, self.fee_type)

    def test_lesson_material_filtered_by_term(self):
        from academics.models import Subject, LessonMaterial
        subj = Subject.objects.create(name="Science", code="SCI-SESS", level=self.level)

        mat1 = LessonMaterial.objects.create(
            teacher=self.teacher, school_class=self.school_class, subject=subj,
            term=self.term1, week="Week 1", topic="Plants", objectives="Learn plants", status="approved"
        )
        mat2 = LessonMaterial.objects.create(
            teacher=self.teacher, school_class=self.school_class, subject=subj,
            term=self.term2_1, week="Week 1", topic="Animals", objectives="Learn animals", status="approved"
        )

        self.client.force_authenticate(user=self.admin)
        url = reverse('lessonmaterial-list')

        res_term1 = self.client.get(f"{url}?term={self.term1.id}")
        self.assertEqual(res_term1.status_code, status.HTTP_200_OK)
        results1 = res_term1.data.get('results', res_term1.data)
        self.assertEqual(len(results1), 1)
        self.assertEqual(results1[0]['id'], str(mat1.id))

        res_term2 = self.client.get(f"{url}?term={self.term2_1.id}")
        self.assertEqual(res_term2.status_code, status.HTTP_200_OK)
        results2 = res_term2.data.get('results', res_term2.data)
        self.assertEqual(len(results2), 1)
        self.assertEqual(results2[0]['id'], str(mat2.id))

