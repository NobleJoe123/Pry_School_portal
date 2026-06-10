from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import User, StudentProfile, TeacherProfile, ParentProfile, EnrollmentRequest, Notification
from django.db import transaction

class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model - used for responses"""
    full_name = serializers.CharField(read_only=True)
    profile_photo_url = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'middle_name', 'last_name',
            'full_name', 'role', 'phone', 'date_of_birth', 'address',
            'profile_photo_url', 'is_active', 'date_joined', 'children'
        ]
        read_only_fields = ['id', 'date_joined']
    
    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_photo.url)
            return obj.profile_photo.url
        return None

    def get_children(self, obj):
        if obj.role == 'parent' and hasattr(obj, 'children'):
            children = obj.children.all()
            return [
                {
                    'user': {
                        'id': child.user.id,
                        'full_name': child.user.full_name,
                        'profile_photo_url': self.get_profile_photo_url(child.user)
                    },
                    'profile': {
                        'admission_number': child.admission_number,
                        'current_class': {'name': child.current_class.name} if child.current_class else None
                    }
                } for child in children
            ]
        return None


class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=False,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'email', 'username', 'first_name', 'last_name',
            'password', 'password_confirm', 'phone', 'date_of_birth'
        ]
    
    def validate(self, attrs):
        if 'password_confirm' in attrs and attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {"password_confirm": "Password fields didn't match."}
            )
        return attrs
    
    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value.lower()
    
    def validate_username(self, value):
        if User.objects.filter(username=value.lower()).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value.lower()
    
    def create(self, validated_data):
        validated_data.pop('password_confirm', None)
        validated_data['role'] = 'parent'  # Default role for self-registration
        
        user = User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password'],
            phone=validated_data.get('phone', ''),
            date_of_birth=validated_data.get('date_of_birth'),
            role=validated_data['role']
        )
        
        # Auto-create parent profile
        ParentProfile.objects.create(user=user)
        
        return user


class StudentProfileSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.full_name', read_only=True, allow_null=True, default=None)
    
    class Meta:
        model = StudentProfile
        fields = '__all__'

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        if instance.current_class:
            representation['current_class'] = instance.current_class.name
        else:
            representation['current_class'] = None
        return representation


class TeacherProfileSerializer(serializers.ModelSerializer):
    assigned_class = serializers.SerializerMethodField()
    
    class Meta:
        model = TeacherProfile
        fields = '__all__'

    def get_assigned_class(self, obj):
        assigned_class = obj.user.assigned_classes.first()
        return assigned_class.name if assigned_class else None


class ParentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    children = StudentProfileSerializer(source='user.children', many=True, read_only=True)
    
    class Meta:
        model = ParentProfile
        fields = '__all__'


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value
    
# STUDENT PROFILE SERILAIZERS 

class StudentDetailSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    student_profile = StudentProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['user', 'student_profile']
        
    def get_user(self, obj):
        return UserSerializer(obj, context=self.context).data


class StudentListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    profile_photo_url = serializers.SerializerMethodField()
    student_profile = StudentProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'role', 'phone', 'date_of_birth', 'address',
            'profile_photo_url', 'is_active', 'date_joined', 'student_profile'
        ]
        
    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_photo.url)
            return obj.profile_photo.url
        return None
        

class CreateStudentSerializer(serializers.Serializer):
    """Serializer for creating a new student (User + Profile)"""
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    first_name = serializers.CharField(max_length=150)
    middle_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False)
    
    admission_number = serializers.CharField(max_length=50, required=False, allow_blank=True)
    state_of_origin = serializers.CharField(max_length=100, required=False, allow_blank=True)
    place_of_birth = serializers.CharField(max_length=100, required=False, allow_blank=True)
    current_class = serializers.CharField(max_length=50, required=False, allow_blank=True)
    gender = serializers.ChoiceField(choices=['M', 'F'])
    blood_group = serializers.CharField(max_length=5, required=False, allow_blank=True)
    admission_date = serializers.DateField(required=False, allow_null=True)
    parent_id = serializers.UUIDField(required=False, allow_null=True)
    emergency_contact_name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    emergency_contact_relationship = serializers.CharField(max_length=50, required=False, allow_blank=True)
    medical_conditions = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=['active', 'graduated', 'transferred', 'suspended'], default='active', required=False)
    
    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("This email already exists.")
        return value.lower()
    
    def validate_admission_number(self, value):
        if StudentProfile.objects.filter(admission_number=value).exists():
            raise serializers.ValidationError("This admission number already exists")
        return value
    
    def validate_parent_id(self, value):
        if value:
            try:
                User.objects.get(id=value, role='parent')
            except User.DoesNotExist:
                raise serializers.ValidationError("Parent with this ID does not exist.")
        return value
    

    @transaction.atomic
    def create(self, validated_data):
        import secrets
        import string
        
        password = validated_data.pop('password', None)
        self.context['generated_password'] = password
        
        current_class_name = validated_data.pop('current_class', '')
        school_class = None
        if current_class_name:
            from academics.models import SchoolClass
            school_class = SchoolClass.objects.filter(name__iexact=current_class_name).first()

        # Auto-generate admission number if not provided
        import uuid as _uuid
        from django.utils import timezone as _tz
        raw_adm = validated_data.pop('admission_number', '') or ''
        adm_num = raw_adm.strip() or f"ADM{_tz.now().year}{_uuid.uuid4().hex[:6].upper()}"

        profile_fields = {
            'admission_number': adm_num,
            'state_of_origin': validated_data.pop('state_of_origin', ''),
            'place_of_birth': validated_data.pop('place_of_birth', ''),
            'current_class': school_class,
            'gender': validated_data.pop('gender'),
            'blood_group': validated_data.pop('blood_group', ''),
            'admission_date': validated_data.pop('admission_date', None),
            'emergency_contact_name': validated_data.pop('emergency_contact_name', ''),
            'emergency_contact_phone': validated_data.pop('emergency_contact_phone', ''),
            'emergency_contact_relationship': validated_data.pop('emergency_contact_relationship', ''),
            'medical_conditions': validated_data.pop('medical_conditions', ''),
            'status': validated_data.pop('status', 'active'),
        }
        
        parent_id = validated_data.pop('parent_id', None)
        parent = None
        if parent_id:
            parent = User.objects.get(id=parent_id)
        
        user = User.objects.create_user(
            **validated_data,
            password=password,
            role='student',
        )
        if not password:
            user.set_unusable_password()
            user.save(update_fields=['password'])
        
        StudentProfile.objects.create(
            user=user,
            parent=parent,
            **profile_fields
        )
        
        return user


class UpdateStudentSerializer(serializers.Serializer):
    """Serializer for updating an existing student"""
    first_name = serializers.CharField(max_length=150, required=False)
    middle_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    
    current_class = serializers.CharField(max_length=50, required=False, allow_blank=True)
    blood_group = serializers.CharField(max_length=5, required=False, allow_blank=True)
    state_of_origin = serializers.CharField(max_length=100, required=False, allow_blank=True)
    place_of_birth = serializers.CharField(max_length=100, required=False, allow_blank=True)
    parent_id = serializers.UUIDField(required=False, allow_null=True)
    emergency_contact_name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    emergency_contact_relationship = serializers.CharField(max_length=50, required=False, allow_blank=True)
    medical_conditions = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=['active', 'graduated', 'transferred', 'suspended'], required=False)

    @transaction.atomic
    def update(self, instance, validated_data):
        user_fields = ['first_name', 'middle_name', 'last_name', 'phone', 'date_of_birth', 'address', 'is_active']
        for field in user_fields:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()
        
        profile = instance.student_profile
        profile_fields = [
            'blood_group', 'state_of_origin', 'place_of_birth',
            'emergency_contact_name', 'emergency_contact_phone',
            'emergency_contact_relationship', 'medical_conditions', 'status'
        ]
        
        for field in profile_fields:
            if field in validated_data:
                setattr(profile, field, validated_data[field])
        
        if 'current_class' in validated_data:
            current_class_name = validated_data['current_class']
            if current_class_name:
                from academics.models import SchoolClass
                school_class = SchoolClass.objects.filter(name__iexact=current_class_name).first()
                profile.current_class = school_class
            else:
                profile.current_class = None
        
        if 'parent_id' in validated_data:
            parent_id = validated_data['parent_id']
            if parent_id:
                profile.parent = User.objects.get(id=parent_id, role='parent')
            else:
                profile.parent = None
                
        profile.save()
        return instance



# TEACHER MANAGEMENT SERIALIZERS

class TeacherDetailSerializer(serializers.ModelSerializer):
    """Complete teacher data including user info - model IS User"""
    user = serializers.SerializerMethodField()
    teacher_profile = TeacherProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['user', 'teacher_profile']
        
    def get_user(self, obj):
        return UserSerializer(obj, context=self.context).data


class TeacherListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    profile_photo_url = serializers.SerializerMethodField()
    teacher_profile = TeacherProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'role', 'phone', 'date_of_birth', 'address',
            'profile_photo_url', 'is_active', 'date_joined', 'last_login',
            'teacher_profile'
        ]
        
    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_photo.url)
            return obj.profile_photo.url
        return None
        
class CreateTeacherSerializer(serializers.Serializer):
    """Serializer for creating a new teacher"""
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False)
    
    staff_id = serializers.CharField(max_length=20)
    employment_status = serializers.ChoiceField(
        choices=['full_time', 'part_time', 'contract'],
        default='full_time'
    )
    
    date_of_joining = serializers.DateField(required=False, allow_null=False)
    highest_qualification = serializers.CharField(max_length=100, required=False, allow_blank=True)
    specialization = serializers.CharField(max_length=100, required=False, allow_blank=True)
    years_of_experience = serializers.IntegerField(default=0)
    subjects_taught = serializers.CharField(required=False, allow_blank=True)
    monthly_salary = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    is_class_teacher = serializers.BooleanField(default=False)
    assigned_class = serializers.CharField(max_length=50, required=False, allow_blank=True)
    emergency_contact_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    
    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("This email already exists.")
        return value.lower()
    
    def validate_username(self, value):
        if User.objects.filter(username=value.lower()).exists():
            raise serializers.ValidationError("This username already exists.")
        return value.lower()
    
    
    def validate_staff_id(self, value):
        if TeacherProfile.objects.filter(staff_id=value).exists():
            raise serializers.ValidationError("This staff id already exists.")
        return value.lower()
    
    
    @transaction.atomic
    def create(self, validated_data):
        password = validated_data.pop('password', 'teacher123')
        
        profile_fields = {
            'staff_id': validated_data.pop('staff_id'),
            'employment_status': validated_data.pop('employment_status', 'full_time'),
            'date_of_joining': validated_data.pop('date_of_joining', None),
            'highest_qualification': validated_data.pop('highest_qualification', ''),
            'specialization': validated_data.pop('specialization', ''),
            'years_of_experience': validated_data.pop('years_of_experience', 0),
            'subjects_taught': validated_data.pop('subjects_taught', ''),
            'monthly_salary': validated_data.pop('monthly_salary', None),
            'is_class_teacher': validated_data.pop('is_class_teacher', False),
            'emergency_contact_name': validated_data.pop('emergency_contact_name', ''),
            'emergency_contact_phone': validated_data.pop('emergency_contact_phone', ''),
        }
        
        assigned_class_name = validated_data.pop('assigned_class', '')
        
        user = User.objects.create_user(
            **validated_data,
            password=password,
            role='teacher'
        )
        
        
        TeacherProfile.objects.create(
            user=user,
            **profile_fields
        )
        
        if assigned_class_name:
            from academics.models import SchoolClass
            try:
                school_class = SchoolClass.objects.filter(name=assigned_class_name).first()
                if school_class:
                    school_class.teacher = user
                    school_class.save()
            except Exception:
                pass
                
        return user


class UpdateTeacherSerializer(serializers.Serializer):
    """Serializer for updating an existing teacher"""
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    
    employment_status = serializers.ChoiceField(
        choices=['full_time', 'part_time', 'contract'],
        required=False
    )
    highest_qualification = serializers.CharField(max_length=100, required=False, allow_blank=True)
    specialization = serializers.CharField(max_length=100, required=False, allow_blank=True)
    years_of_experience = serializers.IntegerField(required=False)
    subjects_taught = serializers.CharField(required=False, allow_blank=True)
    monthly_salary = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    is_class_teacher = serializers.BooleanField(required=False)
    assigned_class = serializers.CharField(max_length=50, required=False, allow_blank=True)
    emergency_contact_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(max_length=17, required=False, allow_blank=True)

    @transaction.atomic
    def update(self, instance, validated_data):
        user_fields = ['first_name', 'last_name', 'phone', 'date_of_birth', 'address', 'is_active']
        for field in user_fields:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()
        
        profile = instance.teacher_profile
        profile_fields = [
            'employment_status', 'highest_qualification', 'specialization',
            'years_of_experience', 'subjects_taught', 'monthly_salary',
            'is_class_teacher', 'emergency_contact_name', 'emergency_contact_phone'
        ]
        for field in profile_fields:
            if field in validated_data:
                setattr(profile, field, validated_data[field])
        profile.save()
        
        if 'assigned_class' in validated_data:
            assigned_class_name = validated_data['assigned_class']
            from academics.models import SchoolClass
            
            # Remove this teacher from any classes they were previously assigned to
            SchoolClass.objects.filter(teacher=instance).update(teacher=None)
            
            if assigned_class_name:
                school_class = SchoolClass.objects.filter(name__iexact=assigned_class_name).first()
                if school_class:
                    school_class.teacher = instance
                    school_class.save()
                    
        return instance


class CreateParentSerializer(serializers.Serializer):
    """Serializer for creating a new parent by admin"""
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False)
    
    relationship_to_student = serializers.ChoiceField(
        choices=['father', 'mother', 'guardian', 'other'],
        default='guardian'
    )
    occupation = serializers.CharField(max_length=100, required=False, allow_blank=True)
    employer = serializers.CharField(max_length=150, required=False, allow_blank=True)
    office_address = serializers.CharField(required=False, allow_blank=True)
    office_phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    alternate_phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    
    student_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False
    )

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("This email already exists.")
        return value.lower()
    
    def validate_username(self, value):
        if User.objects.filter(username=value.lower()).exists():
            raise serializers.ValidationError("This username already exists.")
        return value.lower()

    @transaction.atomic
    def create(self, validated_data):
        import secrets
        import string
        
        password = validated_data.pop('password', None)
        if not password:
            alphabet = string.ascii_letters + string.digits
            password = ''.join(secrets.choice(alphabet) for i in range(8))
            
        student_ids = validated_data.pop('student_ids', [])
        
        profile_fields = {
            'relationship_to_student': validated_data.pop('relationship_to_student', 'guardian'),
            'occupation': validated_data.pop('occupation', ''),
            'employer': validated_data.pop('employer', ''),
            'office_address': validated_data.pop('office_address', ''),
            'office_phone': validated_data.pop('office_phone', ''),
            'alternate_phone': validated_data.pop('alternate_phone', ''),
        }
        
        user_fields = {
            'email': validated_data['email'],
            'username': validated_data['username'],
            'first_name': validated_data['first_name'],
            'last_name': validated_data['last_name'],
            'phone': validated_data.get('phone', ''),
            'date_of_birth': validated_data.get('date_of_birth'),
            'address': validated_data.get('address', ''),
            'role': 'parent',
        }
        
        user = User.objects.create_user(**user_fields, password=password)
        
        ParentProfile.objects.create(
            user=user,
            **profile_fields
        )
        
        if student_ids:
            StudentProfile.objects.filter(user_id__in=student_ids).update(parent=user)
            
        return user


class UpdateParentSerializer(serializers.Serializer):
    """Serializer for updating an existing parent by admin"""
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    
    relationship_to_student = serializers.ChoiceField(
        choices=['father', 'mother', 'guardian', 'other'],
        required=False
    )
    occupation = serializers.CharField(max_length=100, required=False, allow_blank=True)
    employer = serializers.CharField(max_length=150, required=False, allow_blank=True)
    office_address = serializers.CharField(required=False, allow_blank=True)
    office_phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    alternate_phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    
    student_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False
    )

    @transaction.atomic
    def update(self, instance, validated_data):
        user_fields = ['first_name', 'last_name', 'phone', 'date_of_birth', 'address', 'is_active']
        for field in user_fields:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()
        
        profile, created = ParentProfile.objects.get_or_create(user=instance)
        profile_fields = [
            'relationship_to_student', 'occupation', 'employer',
            'office_address', 'office_phone', 'alternate_phone'
        ]
        for field in profile_fields:
            if field in validated_data:
                setattr(profile, field, validated_data[field])
        profile.save()
        
        if 'student_ids' in validated_data:
            student_ids = validated_data['student_ids']
            # Unlink previous students
            StudentProfile.objects.filter(parent=instance).update(parent=None)
            if student_ids:
                StudentProfile.objects.filter(user_id__in=student_ids).update(parent=instance)
                
        return instance


    # Parent Details Serializers
    
class ParentDetailSerializer(serializers.ModelSerializer):
    """Complete parent data with children"""
    parent_profile = ParentProfileSerializer(read_only=True)
    children = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'role', 'phone', 'date_of_birth', 'address', 'is_active', 
                  'date_joined', 'parent_profile', 'children']
        
    def get_children(self, obj):
        children_profiles = obj.children.all()
        children_data = []
        for profile in children_profiles:
            children_data.append({
                'user': UserSerializer(profile.user, context=self.context).data,
                'profile': StudentProfileSerializer(profile, context=self.context).data
            })
        return children_data  

class EnrollmentRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnrollmentRequest
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True}
        }


class NotificationSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    recipient_name = serializers.CharField(source='recipient.full_name', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'sender', 'sender_name', 'recipient', 'recipient_name',
            'title', 'message', 'category', 'audience', 'is_read',
            'created_at', 'read_at'
        ]
        read_only_fields = ['id', 'sender', 'recipient', 'created_at', 'read_at']


class NotificationCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=180)
    message = serializers.CharField()
    category = serializers.ChoiceField(
        choices=['general', 'attendance', 'finance', 'academics', 'enrollment'],
        default='general',
        required=False
    )
    audience = serializers.ChoiceField(
        choices=['selected', 'all_teachers', 'all_parents', 'all_students', 'all_staff'],
        default='selected'
    )
    recipient_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True
    )

    def validate(self, attrs):
        audience = attrs.get('audience', 'selected')
        recipient_ids = attrs.get('recipient_ids', [])
        if audience == 'selected' and not recipient_ids:
            raise serializers.ValidationError({'recipient_ids': 'Select at least one recipient.'})
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        audience = validated_data.get('audience', 'selected')
        recipient_ids = validated_data.get('recipient_ids', [])

        if audience == 'all_teachers':
            recipients = User.objects.filter(role='teacher', is_active=True)
        elif audience == 'all_parents':
            recipients = User.objects.filter(role='parent', is_active=True)
        elif audience == 'all_students':
            recipients = User.objects.filter(role='student', is_active=True)
        elif audience == 'all_staff':
            recipients = User.objects.filter(role__in=['admin', 'teacher'], is_active=True)
        else:
            recipients = User.objects.filter(id__in=recipient_ids, is_active=True)

        notifications = [
            Notification(
                sender=request.user,
                recipient=recipient,
                title=validated_data['title'],
                message=validated_data['message'],
                category=validated_data.get('category', 'general'),
                audience=audience
            )
            for recipient in recipients.exclude(id=request.user.id)
        ]
        return Notification.objects.bulk_create(notifications)
