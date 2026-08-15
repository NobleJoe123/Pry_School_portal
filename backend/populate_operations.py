import os
import django
import datetime
from django.utils import timezone
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'portal.settings')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import ParentProfile, TeacherProfile, StudentProfile, EnrollmentRequest
from academics.models import ClassLevel, SchoolClass, AcademicYear, Term, Subject
from finance.models import FeeType, StudentFee, PaymentRecord
from attendance.models import StudentAttendance

User = get_user_model()

def seed_data():
    print("🚀 Starting operations-centric database seeding...")

    # 1. Academic Year
    academic_year, ay_created = AcademicYear.objects.get_or_create(
        name='2025/2026',
        defaults={
            'start_date': datetime.date(2025, 9, 1),
            'end_date': datetime.date(2026, 7, 31),
            'is_current': True
        }
    )
    if not academic_year.is_current:
        academic_year.is_current = True
        academic_year.save()
    print(f"Academic Year: {academic_year.name} (Current)")

    # 2. Terms (3 terms each lasting 3 months, 3rd term followed by 1-month vacation)
    terms_info = [
        ('1st Term', datetime.date(2025, 9, 1), datetime.date(2025, 11, 30), datetime.date(2025, 9, 1), False),
        ('2nd Term', datetime.date(2026, 1, 10), datetime.date(2026, 4, 10), datetime.date(2026, 1, 10), False),
        ('3rd Term', datetime.date(2026, 5, 1), datetime.date(2026, 7, 31), datetime.date(2026, 5, 1), True),
    ]
    current_term = None
    created_terms = {}
    for name, start, end, res_date, is_curr in terms_info:
        t, created = Term.objects.get_or_create(
            academic_year=academic_year,
            name=name,
            defaults={'start_date': start, 'end_date': end, 'resumption_date': res_date, 'is_current': is_curr}
        )
        if t.start_date != start or t.end_date != end or t.resumption_date != res_date:
            t.start_date = start
            t.end_date = end
            t.resumption_date = res_date
            t.save()
        if is_curr:
            t.is_current = True
            t.save()
            current_term = t
        created_terms[name] = t
    print(f"Current Term: {current_term.name}")

    # 3. Class Levels and NERDC BEC Curriculum Subjects
    levels_data = [
        ('Primary 1', 1),
        ('Primary 2', 2),
        ('Primary 3', 3),
        ('Primary 4', 4),
        ('Primary 5', 5),
        ('Primary 6', 6),
    ]

    # NERDC BEC (Basic Education Curriculum) standard subjects
    subjects_list = [
        ('English Studies', 'ENG'),
        ('Mathematics', 'MATH'),
        ('Basic Science & Technology', 'BST'),
        ('National Values Education', 'NVE'),
        ('Pre-Vocational Studies', 'PVS'),
        ('Cultural & Creative Arts', 'CCA'),
        ('Religious Studies', 'CRS'),
        ('Nigerian Languages', 'NIG'),
    ]

    levels = {}
    for name, num in levels_data:
        lvl, _ = ClassLevel.objects.get_or_create(name=name, defaults={'numeric_level': num})
        levels[name] = lvl
        
        # Create or update NERDC BEC subjects per class level
        for sub_name, code_prefix in subjects_list:
            code_val = f"{code_prefix}{num}"
            subj, created = Subject.objects.get_or_create(
                code=code_val,
                defaults={'name': sub_name, 'level': lvl}
            )
            if not created:
                subj.name = sub_name
                subj.level = lvl
                subj.save()
    print("Class levels and NERDC BEC curriculum subjects per level created.")

    # 3b. Seed Real NERDC BEC School Calendar Events across all terms
    from academics.models import SchoolEvent
    events_data = [
        # 1st Term Events
        ('Term Resumption & Orientation', 'Classes start for all pupils. General assembly and registration.', datetime.date(2025, 9, 1), 'academic', 'all', 'high', created_terms['1st Term']),
        ('First Continuous Assessment (CA 1)', 'Continuous assessment evaluations across NERDC BEC core subjects.', datetime.date(2025, 10, 15), 'exam', 'all', 'medium', created_terms['1st Term']),
        ('Mid-Term Break', 'Mid-term break holiday period. School resumes following Monday.', datetime.date(2025, 10, 24), 'holiday', 'all', 'low', created_terms['1st Term']),
        ('Parent-Teacher Association (PTA) Meeting', 'PTA termly evaluation and progress review meeting.', datetime.date(2025, 11, 5), 'meeting', 'parents', 'medium', created_terms['1st Term']),
        ('1st Term Terminal Examinations', 'End of term examinations across all classes.', datetime.date(2025, 11, 17), 'exam', 'all', 'high', created_terms['1st Term']),
        ('1st Term Vacation & Closing Assembly', 'Pupil report cards published and term closing ceremony.', datetime.date(2025, 11, 30), 'academic', 'all', 'high', created_terms['1st Term']),

        # 2nd Term Events
        ('2nd Term Resumption', 'School resumes for 2nd Academic Term.', datetime.date(2026, 1, 10), 'academic', 'all', 'high', created_terms['2nd Term']),
        ('2nd Term CA 1 Evaluation', 'Mid-term CA testing for 2nd term.', datetime.date(2026, 2, 15), 'exam', 'all', 'medium', created_terms['2nd Term']),
        ('2nd Term Mid-Term Break', 'Mid-term break for 2nd term.', datetime.date(2026, 2, 25), 'holiday', 'all', 'low', created_terms['2nd Term']),
        ('Annual Inter-House Sports Competition', 'School sports day activities and track competitions.', datetime.date(2026, 3, 10), 'sports', 'all', 'medium', created_terms['2nd Term']),
        ('2nd Term Terminal Examinations', 'End of 2nd term examinations.', datetime.date(2026, 3, 20), 'exam', 'all', 'high', created_terms['2nd Term']),
        ('2nd Term Vacation & Closing', '2nd term closes; report cards published and vacation notice issued.', datetime.date(2026, 4, 10), 'academic', 'all', 'high', created_terms['2nd Term']),

        # 3rd Term Events
        ('3rd Term Resumption', 'School resumes for 3rd Academic Term.', datetime.date(2026, 5, 1), 'academic', 'all', 'high', created_terms['3rd Term']),
        ('3rd Term CA 1 Evaluation', 'Continuous assessment evaluations for 3rd term.', datetime.date(2026, 6, 10), 'exam', 'all', 'medium', created_terms['3rd Term']),
        ('3rd Term Mid-Term Break', 'Mid-term break for 3rd term.', datetime.date(2026, 6, 20), 'holiday', 'all', 'low', created_terms['3rd Term']),
        ('Cultural & Creative Arts Exhibition', 'Exhibition of pupil artwork, music, and performance.', datetime.date(2026, 7, 5), 'sports', 'all', 'medium', created_terms['3rd Term']),
        ('3rd Term Promotional Examinations', 'Annual promotional examinations across all primary levels.', datetime.date(2026, 7, 15), 'exam', 'all', 'high', created_terms['3rd Term']),
        ('3rd Term Closing & 1-Month Long Vacation Commencement', 'Graduation ceremony, official report card publication, and commencement of the 1-month August long vacation.', datetime.date(2026, 7, 31), 'academic', 'all', 'high', created_terms['3rd Term']),
    ]

    for title, desc, date_val, cat, aud, prio, term_obj in events_data:
        SchoolEvent.objects.get_or_create(
            title=title,
            term=term_obj,
            defaults={
                'description': desc,
                'date': date_val,
                'category': cat,
                'audience': aud,
                'priority': prio,
                'is_published': True,
                'is_important': True
            }
        )
    print("Real NERDC BEC School Calendar events populated for all terms.")

    # 4. Teachers
    teachers_data = [
        {'username': 'sarah_jenkins', 'email': 'sarah.jenkins@school.local', 'first_name': 'Sarah', 'last_name': 'Jenkins', 'title': 'Mrs', 'class_name': 'Primary 1'},
        {'username': 'robert_smith', 'email': 'robert.smith@school.local', 'first_name': 'Robert', 'last_name': 'Smith', 'title': 'Mr', 'class_name': 'Primary 2'},
        {'username': 'emily_davis', 'email': 'emily.davis@school.local', 'first_name': 'Emily', 'last_name': 'Davis', 'title': 'Mrs', 'class_name': 'Primary 3'},
        {'username': 'john_doe', 'email': 'john.doe@school.local', 'first_name': 'John', 'last_name': 'Doe', 'title': 'Mr', 'class_name': 'Primary 4'},
        {'username': 'michael_johnson', 'email': 'michael.johnson@school.local', 'first_name': 'Michael', 'last_name': 'Johnson', 'title': 'Mr', 'class_name': 'Primary 5'},
        {'username': 'jessica_brown', 'email': 'jessica.brown@school.local', 'first_name': 'Jessica', 'last_name': 'Brown', 'title': 'Mrs', 'class_name': 'Primary 6'},
    ]

    teachers = []
    classes = {}
    for td in teachers_data:
        u, created = User.objects.get_or_create(
            username=td['username'],
            defaults={
                'email': td['email'],
                'first_name': td['first_name'],
                'last_name': td['last_name'],
                'role': 'teacher',
                'is_active': True
            }
        )
        if created:
            u.set_password('teacher123')
            u.save()
        
        TeacherProfile.objects.get_or_create(
            user=u,
            defaults={
                'staff_id': f"TCH_{td['username'].upper()}",
                'employment_status': 'full_time',
                'title': td['title']
            }
        )

        lvl = levels[td['class_name']]
        sc, _ = SchoolClass.objects.get_or_create(
            name=td['class_name'],
            academic_year=academic_year,
            defaults={'level': lvl, 'teacher': u}
        )
        classes[td['class_name']] = sc
        teachers.append(u)
    print("Teachers and School Classes mapped.")

    # 5. Parents
    parent1_user, _ = User.objects.get_or_create(
        username='jane_smith',
        defaults={
            'email': 'jane.smith@email.com',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'role': 'parent',
            'is_active': True,
            'phone': '+2348033334444',
            'address': '12 Victoria Island, Lagos'
        }
    )
    if parent1_user.password == "":
        parent1_user.set_password('parent123')
        parent1_user.save()

    p1_profile, _ = ParentProfile.objects.get_or_create(
        user=parent1_user,
        defaults={
            'relationship_to_student': 'mother',
            'completed_profile': True,
            'occupation': 'Business Manager'
        }
    )

    parent2_user, _ = User.objects.get_or_create(
        username='richard_kline',
        defaults={
            'email': 'richard.kline@email.com',
            'first_name': 'Richard',
            'last_name': 'Kline',
            'role': 'parent',
            'is_active': True
        }
    )
    if parent2_user.password == "":
        parent2_user.set_password('parent123')
        parent2_user.save()

    p2_profile, _ = ParentProfile.objects.get_or_create(
        user=parent2_user,
        defaults={
            'relationship_to_student': 'father',
            'completed_profile': False  # Mandatory completion modal will show for Richard!
        }
    )
    print("Parents created (Jane: Completed, Richard: Incomplete).")

    # 6. Pupils (Students)
    pupils_data = [
        {'username': 'samuel_smith', 'first_name': 'Samuel', 'last_name': 'Smith', 'adm': 'ADM/2026/001', 'class_name': 'Primary 1', 'parent': parent1_user},
        {'username': 'sarah_smith', 'first_name': 'Sarah', 'last_name': 'Smith', 'adm': 'ADM/2026/002', 'class_name': 'Primary 2', 'parent': parent1_user},
        {'username': 'john_kline', 'first_name': 'John', 'last_name': 'Kline', 'adm': 'ADM/2026/003', 'class_name': 'Primary 3', 'parent': parent2_user},
        {'username': 'emma_watson', 'first_name': 'Emma', 'last_name': 'Watson', 'adm': 'ADM/2026/004', 'class_name': 'Primary 4', 'parent': None},
        {'username': 'lucas_gray', 'first_name': 'Lucas', 'last_name': 'Gray', 'adm': 'ADM/2026/005', 'class_name': 'Primary 5', 'parent': None},
        {'username': 'olivia_wild', 'first_name': 'Olivia', 'last_name': 'Wild', 'adm': 'ADM/2026/006', 'class_name': 'Primary 6', 'parent': None},
    ]

    pupil_users = []
    for pd in pupils_data:
        u, created = User.objects.get_or_create(
            username=pd['username'],
            defaults={
                'email': f"{pd['username']}@school.local",
                'first_name': pd['first_name'],
                'last_name': pd['last_name'],
                'role': 'student',
                'is_active': True
            }
        )
        if created:
            u.set_password('student123')
            u.save()

        sc = classes[pd['class_name']]
        sp, _ = StudentProfile.objects.get_or_create(
            user=u,
            defaults={
                'admission_number': pd['adm'],
                'current_class': sc,
                'parent': pd['parent'],
                'gender': 'M' if pd['username'] in ['samuel_smith', 'john_kline', 'lucas_gray'] else 'F',
                'status': 'active'
            }
        )
        pupil_users.append((u, sp))
    print("Pupils enrolled and assigned to classes.")

    # 7. Fee Seeding & Payments
    # Create FeeType for each level
    admin_user = User.objects.filter(role='admin').first()
    if not admin_user:
        # Create a default admin if none exists
        admin_user, _ = User.objects.get_or_create(
            username='admin_joe',
            defaults={
                'email': 'admin@school.local',
                'first_name': 'Noble',
                'last_name': 'Joe',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True
            }
        )
        admin_user.set_password('admin123')
        admin_user.save()

    for name, lvl in levels.items():
        fee_type, _ = FeeType.objects.get_or_create(
            name='Term Tuition Fee',
            level=lvl,
            defaults={'amount': 50000.00, 'description': 'Standard tuition fee per term'}
        )
        
        # Get students in this level's class
        sc = classes[name]
        for u, sp in pupil_users:
            if sp.current_class == sc:
                # Assign fee
                sf, sf_created = StudentFee.objects.get_or_create(
                    student=u,
                    fee_type=fee_type,
                    term=current_term,
                    defaults={'status': 'outstanding', 'amount_paid': 0.00}
                )

                if sf_created:
                    # Let's customize payments per student to create varying outstanding/paid statuses
                    if u.username == 'samuel_smith':
                        # Fully paid
                        sf.amount_paid = 50000.00
                        sf.status = 'paid'
                        sf.save()
                        PaymentRecord.objects.create(
                            student_fee=sf,
                            amount=50000.00,
                            payment_method='transfer',
                            transaction_id='TXN_SAMUEL_101',
                            received_by=admin_user
                        )
                    elif u.username == 'sarah_smith':
                        # Partially paid
                        sf.amount_paid = 20000.00
                        sf.status = 'partial'
                        sf.save()
                        PaymentRecord.objects.create(
                            student_fee=sf,
                            amount=20000.00,
                            payment_method='card',
                            transaction_id='TXN_SARAH_202',
                            received_by=admin_user
                        )
                    # John Kline, Emma Watson, etc. remain Outstanding (balance = 50000)

    print("Fees and payment history populated.")

    # 8. Today's Attendance logs
    today = timezone.now().date()
    attendance_statuses = {
        'samuel_smith': 'present',
        'sarah_smith': 'present',
        'john_kline': 'absent',
        'emma_watson': 'late',
        'lucas_gray': 'present',
        'olivia_wild': 'present'
    }

    for u, sp in pupil_users:
        status = attendance_statuses.get(u.username, 'present')
        remarks = "Late due to traffic" if status == 'late' else ("Illness" if status == 'absent' else "Early")
        StudentAttendance.objects.get_or_create(
            student=u,
            date=today,
            defaults={
                'school_class': sp.current_class,
                'term': current_term,
                'status': status,
                'remarks': remarks
            }
        )
    print("Today's student attendance logs seeded.")

    # 9. Enrollment Requests
    EnrollmentRequest.objects.get_or_create(
        parent_email='yusuf.parent@gmail.com',
        defaults={
            'parent_first_name': 'Adewale',
            'parent_last_name': 'Yusuf',
            'parent_phone': '+2348066554433',
            'parent_address': '34 Gbagada Expressway, Lagos',
            'relationship_to_student': 'father',
            'students_data': [
                {
                    'first_name': 'Bola',
                    'last_name': 'Yusuf',
                    'gender': 'F',
                    'date_of_birth': '2019-04-10',
                    'class_level': 'Primary 1'
                }
            ],
            'status': 'pending'
        }
    )
    print("Pending Enrollment request created.")
    print("✨ Database successfully populated with Primary School operations data!")

if __name__ == '__main__':
    seed_data()
