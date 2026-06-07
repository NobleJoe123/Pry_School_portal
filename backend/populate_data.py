from django.contrib.auth import get_user_model
from accounts.models import TeacherProfile
from academics.models import ClassLevel, SchoolClass, AcademicYear
User = get_user_model()

print("Starting class and teacher data seeding...")

# 1. Ensure levels exist
for name, num in [
    ('Primary 1', 1),
    ('Primary 2', 2),
    ('Primary 3', 3),
    ('Primary 4', 4),
    ('Primary 5', 5),
    ('Primary 6', 6),
]:
    ClassLevel.objects.get_or_create(name=name, defaults={'numeric_level': num})

# 2. Get current academic year
academic_year = AcademicYear.objects.filter(is_current=True).first()
if not academic_year:
    # If no current academic year, create one
    import datetime
    start = datetime.date(2025, 9, 1)
    end = datetime.date(2026, 7, 31)
    academic_year, _ = AcademicYear.objects.get_or_create(name='2025/2026', defaults={'start_date': start, 'end_date': end, 'is_current': True})

# 3. Rename existing suffix-based classes
class_renames = {
    'Primary 1A': 'Primary 1',
    'Primary 4A': 'Primary 4',
}
for old_name, new_name in class_renames.items():
    sc = SchoolClass.objects.filter(name=old_name).first()
    if sc:
        # Check if new_name already exists to avoid conflict
        exists = SchoolClass.objects.filter(name=new_name, academic_year=academic_year).first()
        if exists:
            # Move relations and delete old
            from accounts.models import StudentProfile
            StudentProfile.objects.filter(current_class=sc).update(current_class=exists)
            sc.delete()
        else:
            sc.name = new_name
            sc.save()
            print(f"Renamed class {old_name} to {new_name}")

# 4. Create teachers and assign them to classes Primary 1 to Primary 6
teachers_data = [
    {'username': 'john_doe', 'email': 'john.doe@school.local', 'first_name': 'John', 'last_name': 'Doe', 'title': 'Mr', 'class_name': 'Primary 4'},
    {'username': 'sarah_jenkins', 'email': 'sarah.jenkins@school.local', 'first_name': 'Sarah', 'last_name': 'Jenkins', 'title': 'Mrs', 'class_name': 'Primary 1'},
    {'username': 'robert_smith', 'email': 'robert.smith@school.local', 'first_name': 'Robert', 'last_name': 'Smith', 'title': 'Mr', 'class_name': 'Primary 2'},
    {'username': 'emily_davis', 'email': 'emily.davis@school.local', 'first_name': 'Emily', 'last_name': 'Davis', 'title': 'Mrs', 'class_name': 'Primary 3'},
    {'username': 'michael_johnson', 'email': 'michael.johnson@school.local', 'first_name': 'Michael', 'last_name': 'Johnson', 'title': 'Mr', 'class_name': 'Primary 5'},
    {'username': 'jessica_brown', 'email': 'jessica.brown@school.local', 'first_name': 'Jessica', 'last_name': 'Brown', 'title': 'Mrs', 'class_name': 'Primary 6'},
]

for td in teachers_data:
    user, created = User.objects.get_or_create(
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
        user.set_password('teacher123')
        user.save()
        print(f"Created teacher user: {user.full_name}")
    
    # Ensure profile
    profile, p_created = TeacherProfile.objects.get_or_create(
        user=user,
        defaults={
            'staff_id': f"TCH_{td['username'].upper()}",
            'employment_status': 'full_time',
            'title': td['title']
        }
    )
    if not p_created:
        profile.title = td['title']
        profile.save()
        print(f"Updated profile title for: {user.full_name}")
    
    # Ensure SchoolClass exists
    level = ClassLevel.objects.get(name=td['class_name'])
    school_class, sc_created = SchoolClass.objects.get_or_create(
        name=td['class_name'],
        academic_year=academic_year,
        defaults={'level': level, 'teacher': user}
    )
    if not sc_created:
        school_class.teacher = user
        school_class.save()
        print(f"Assigned {td['title']}. {user.last_name} to class {td['class_name']}")
    else:
        print(f"Created class {td['class_name']} with teacher {td['title']}. {user.last_name}")

print("Class and teacher data seeding finished successfully!")
