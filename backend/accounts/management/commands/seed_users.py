from django.core.management.base import BaseCommand
from accounts.models import User, StudentProfile, TeacherProfile, ParentProfile
from academics.models import AcademicYear, ClassLevel, SchoolClass, Subject, AssessmentType, Term
from django.utils import timezone


class Command(BaseCommand):
    help = 'Seed test users and reference data for the school portal'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')

        # ── 1. Academic Year ────────────────────────────────────────────────
        year, _ = AcademicYear.objects.get_or_create(
            name='2025/2026',
            defaults={
                'start_date': '2025-09-01',
                'end_date': '2026-07-31',
                'is_current': True
            }
        )

        # ── 2. Terms ─────────────────────────────────────────────────────────
        term, _ = Term.objects.get_or_create(
            academic_year=year,
            name='1st Term',
            defaults={
                'start_date': '2025-09-01',
                'end_date': '2025-12-15',
                'is_current': True
            }
        )

        # ── 3. Class Levels ───────────────────────────────────────────────────
        level1, _ = ClassLevel.objects.get_or_create(name='Primary 1', defaults={'numeric_level': 1})
        level2, _ = ClassLevel.objects.get_or_create(name='Primary 2', defaults={'numeric_level': 2})
        level3, _ = ClassLevel.objects.get_or_create(name='Primary 3', defaults={'numeric_level': 3})
        level4, _ = ClassLevel.objects.get_or_create(name='Primary 4', defaults={'numeric_level': 4})
        level5, _ = ClassLevel.objects.get_or_create(name='Primary 5', defaults={'numeric_level': 5})
        level6, _ = ClassLevel.objects.get_or_create(name='Primary 6', defaults={'numeric_level': 6})

        # ── 4. Subjects (for all levels) ──────────────────────────────────────
        subjects_data = [
            ('Mathematics', 'MTH'), ('English Language', 'ENG'),
            ('Basic Science', 'BSC'), ('Social Studies', 'SST'),
            ('Civic Education', 'CIV'), ('Computer Studies', 'CMP'),
            ('Physical Education', 'PHE'), ('Fine Arts', 'ART'),
        ]
        for level in [level1, level2, level3, level4, level5, level6]:
            for name, code in subjects_data:
                Subject.objects.get_or_create(
                    name=name, level=level,
                    defaults={'code': f'{code}{level.numeric_level}'}
                )

        # ── 5. Assessment Types ────────────────────────────────────────────────
        ca1, _ = AssessmentType.objects.get_or_create(name='CA 1', defaults={'max_score': 20, 'weight': 20.00})
        ca2, _ = AssessmentType.objects.get_or_create(name='CA 2', defaults={'max_score': 20, 'weight': 20.00})
        exam, _ = AssessmentType.objects.get_or_create(name='Exam', defaults={'max_score': 60, 'weight': 60.00})

        # ── 6. Admin ──────────────────────────────────────────────────────────
        admin_email = 'admin@school.com'
        if not User.objects.filter(email=admin_email).exists():
            User.objects.create_superuser(
                email=admin_email, username='admin', password='password123',
                first_name='Admin', last_name='User'
            )
            self.stdout.write(self.style.SUCCESS(f'Admin: {admin_email} / password123'))

        # ── 7. Teachers ───────────────────────────────────────────────────────
        teachers_data = [
            ('teacher@school.com', 'teacher', 'John', 'Doe', 'TCH001', level4, 'Primary 4A', 65000),
            ('teacher2@school.com', 'teacher2', 'Sarah', 'Williams', 'TCH002', level1, 'Primary 1A', 58000),
            ('teacher3@school.com', 'teacher3', 'James', 'Okonkwo', 'TCH003', level6, 'Primary 6A', 70000),
        ]
        for email, uname, fname, lname, staff_id, level, class_name, salary in teachers_data:
            if not User.objects.filter(email=email).exists():
                teacher_user = User.objects.create_user(
                    email=email, username=uname, password='password123',
                    first_name=fname, last_name=lname, role='teacher'
                )
                s_class, _ = SchoolClass.objects.get_or_create(
                    name=class_name, level=level, academic_year=year,
                    defaults={'teacher': teacher_user}
                )
                TeacherProfile.objects.create(
                    user=teacher_user, staff_id=staff_id, monthly_salary=salary
                )
                self.stdout.write(self.style.SUCCESS(f'Teacher: {email} / password123'))

        # ── 8. Parents & Students ──────────────────────────────────────────────
        family_data = [
            {
                'parent': ('parent@school.com', 'parent', 'Mary', 'Johnson', 'mother'),
                'children': [
                    ('student@school.com', 'student', 'Junior', 'Johnson', 'ADM2025001', level4, 'Primary 4A'),
                    ('student2@school.com', 'student2', 'Grace', 'Johnson', 'ADM2025002', level1, 'Primary 1A'),
                ]
            },
            {
                'parent': ('parent2@school.com', 'parent2', 'David', 'Adeyemi', 'father'),
                'children': [
                    ('student3@school.com', 'student3', 'Tunde', 'Adeyemi', 'ADM2025003', level6, 'Primary 6A'),
                ]
            },
        ]
        for family in family_data:
            pe, pu, pfn, pln, rel = family['parent']
            if not User.objects.filter(email=pe).exists():
                parent_user = User.objects.create_user(
                    email=pe, username=pu, password='password123',
                    first_name=pfn, last_name=pln, role='parent'
                )
                ParentProfile.objects.create(user=parent_user, relationship_to_student=rel)
                self.stdout.write(self.style.SUCCESS(f'Parent: {pe} / password123'))
            else:
                parent_user = User.objects.get(email=pe)

            for se, su, sfn, sln, adm, lvl, cls_name in family['children']:
                if not User.objects.filter(email=se).exists():
                    student_user = User.objects.create_user(
                        email=se, username=su, password='password123',
                        first_name=sfn, last_name=sln, role='student'
                    )
                    s_class, _ = SchoolClass.objects.get_or_create(
                        name=cls_name, level=lvl, academic_year=year
                    )
                    StudentProfile.objects.create(
                        user=student_user, admission_number=adm,
                        parent=parent_user, current_class=s_class
                    )
                    self.stdout.write(self.style.SUCCESS(f'Student: {se} / password123'))

        # ── 9. Finance: Fee Types ────────────────────────────────────────────
        from finance.models import FeeType, StudentFee, PaymentRecord, Payroll

        fee_definitions = [
            (level1, 'Tuition Fee', 45000, 'First term tuition for Primary 1'),
            (level2, 'Tuition Fee', 45000, 'First term tuition for Primary 2'),
            (level3, 'Tuition Fee', 47000, 'First term tuition for Primary 3'),
            (level4, 'Tuition Fee', 47000, 'First term tuition for Primary 4'),
            (level5, 'Tuition Fee', 50000, 'First term tuition for Primary 5'),
            (level6, 'Tuition Fee', 50000, 'First term tuition for Primary 6'),
            (level1, 'Development Levy', 10000, 'Annual development levy'),
            (level4, 'Development Levy', 10000, 'Annual development levy'),
            (level6, 'Development Levy', 10000, 'Annual development levy'),
            (level4, 'Exam Fee', 5000, 'End of term examination fee'),
            (level6, 'Exam Fee', 5000, 'End of term examination fee'),
        ]
        fee_type_map = {}
        for level, name, amount, desc in fee_definitions:
            ft, _ = FeeType.objects.get_or_create(
                name=name, level=level,
                defaults={'amount': amount, 'description': desc}
            )
            fee_type_map[(level.id, name)] = ft

        # ── 10. Assign Fees to Students ──────────────────────────────────────
        students = User.objects.filter(role='student')
        for student in students:
            if not hasattr(student, 'student_profile') or not student.student_profile.current_class:
                continue
            student_level = student.student_profile.current_class.level
            applicable_fees = FeeType.objects.filter(level=student_level)
            for fee_type in applicable_fees:
                StudentFee.objects.get_or_create(
                    student=student, fee_type=fee_type, term=term,
                    defaults={'status': 'outstanding', 'amount_paid': 0}
                )

        # ── 11. Simulate Some Payments ────────────────────────────────────────
        admin_user = User.objects.filter(email='admin@school.com').first()
        # Full payment for student1
        sf1 = StudentFee.objects.filter(
            student__email='student@school.com',
            fee_type__name='Tuition Fee'
        ).first()
        if sf1 and sf1.amount_paid == 0:
            from decimal import Decimal
            sf1.amount_paid = sf1.fee_type.amount
            sf1.status = 'paid'
            sf1.save()
            PaymentRecord.objects.get_or_create(
                student_fee=sf1, amount=sf1.fee_type.amount,
                defaults={
                    'payment_method': 'transfer',
                    'transaction_id': 'TXN-2025-001',
                    'received_by': admin_user
                }
            )
        # Partial payment for student3
        sf3 = StudentFee.objects.filter(
            student__email='student3@school.com',
            fee_type__name='Tuition Fee'
        ).first()
        if sf3 and sf3.amount_paid == 0:
            from decimal import Decimal
            partial = Decimal('25000')
            sf3.amount_paid = partial
            sf3.status = 'partial'
            sf3.save()
            PaymentRecord.objects.get_or_create(
                student_fee=sf3, amount=partial,
                defaults={
                    'payment_method': 'cash',
                    'received_by': admin_user
                }
            )

        # ── 12. Payroll for Teachers ──────────────────────────────────────────
        current_month = timezone.now().month
        current_year = timezone.now().year
        for teacher in User.objects.filter(role='teacher'):
            salary = 50000
            if hasattr(teacher, 'teacher_profile') and teacher.teacher_profile.monthly_salary:
                salary = float(teacher.teacher_profile.monthly_salary)
            Payroll.objects.get_or_create(
                teacher=teacher, month=current_month, year=current_year,
                defaults={
                    'basic_salary': salary,
                    'bonuses': 0,
                    'deductions': 0,
                    'status': 'draft'
                }
            )

        self.stdout.write(self.style.SUCCESS('\n✅ Seeding completed successfully!'))
        self.stdout.write('\nLogin Credentials:')
        self.stdout.write('  Admin:    admin@school.com   / password123')
        self.stdout.write('  Teacher:  teacher@school.com / password123')
        self.stdout.write('  Parent:   parent@school.com  / password123')
        self.stdout.write('  Student:  student@school.com / password123')
