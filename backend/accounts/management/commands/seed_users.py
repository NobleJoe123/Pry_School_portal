from django.core.management.base import BaseCommand
from accounts.models import User, StudentProfile, TeacherProfile, ParentProfile
from academics.models import AcademicYear, ClassLevel, SchoolClass
from django.utils import timezone

class Command(BaseCommand):
    help = 'Seed test users for Admin, Teacher, and Parent roles'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')

        # 1. Create Academic Year if not exists
        year, _ = AcademicYear.objects.get_or_create(
            name='2025/2026',
            defaults={
                'start_date': '2025-09-01',
                'end_date': '2026-07-31',
                'is_current': True
            }
        )

        # 2. Create Class Levels
        level1, _ = ClassLevel.objects.get_or_create(name='Primary 1', defaults={'numeric_level': 1})
        level4, _ = ClassLevel.objects.get_or_create(name='Primary 4', defaults={'numeric_level': 4})

        # 3. Create Admin
        admin_email = 'admin@school.com'
        if not User.objects.filter(email=admin_email).exists():
            User.objects.create_superuser(
                email=admin_email,
                username='admin',
                password='password123',
                first_name='Admin',
                last_name='User'
            )
            self.stdout.write(self.style.SUCCESS(f'Admin created: {admin_email} / password123'))

        # 4. Create Teacher
        teacher_email = 'teacher@school.com'
        if not User.objects.filter(email=teacher_email).exists():
            teacher_user = User.objects.create_user(
                email=teacher_email,
                username='teacher',
                password='password123',
                first_name='John',
                last_name='Doe',
                role='teacher'
            )
            # Create a class for the teacher
            s_class, _ = SchoolClass.objects.get_or_create(
                name='Primary 4A',
                level=level4,
                academic_year=year,
                defaults={'teacher': teacher_user}
            )
            TeacherProfile.objects.create(
                user=teacher_user,
                staff_id='TCH001',
                assigned_class=s_class
            )
            self.stdout.write(self.style.SUCCESS(f'Teacher created: {teacher_email} / password123'))

        # 5. Create Parent and Child
        parent_email = 'parent@school.com'
        if not User.objects.filter(email=parent_email).exists():
            parent_user = User.objects.create_user(
                email=parent_email,
                username='parent',
                password='password123',
                first_name='Mary',
                last_name='Jane',
                role='parent'
            )
            ParentProfile.objects.create(user=parent_user, relationship_to_student='mother')

            # Create Child (Student)
            student_user = User.objects.create_user(
                email='student@school.com',
                username='student',
                password='password123',
                first_name='Junior',
                last_name='Jane',
                role='student'
            )
            s_class_1, _ = SchoolClass.objects.get_or_create(
                name='Primary 1A',
                level=level1,
                academic_year=year
            )
            StudentProfile.objects.create(
                user=student_user,
                admission_number='ADM2025001',
                parent=parent_user,
                current_class=s_class_1
            )
            self.stdout.write(self.style.SUCCESS(f'Parent created: {parent_email} / password123'))
            self.stdout.write(self.style.SUCCESS(f'Student created: student@school.com / password123'))

        self.stdout.write(self.style.SUCCESS('Seeding completed!'))
