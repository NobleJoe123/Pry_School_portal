from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import User, StudentProfile, TeacherProfile, ParentProfile
from django.db import transaction

class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model - used for responses"""
    full_name = serializers.CharField(read_only=True)
    profile_photo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'role', 'phone', 'date_of_birth', 'address',
            'profile_photo_url', 'is_active', 'date_joined'
        ]
        read_only_fields = ['id', 'date_joined']
    
    def get_profile_photo_url(self, obj):
        if obj.profile_photo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_photo.url)
            return obj.profile_photo.url
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
        required=True,
        style={'input_type': 'password'}
    )
    
    class Meta:
        model = User
        fields = [
            'email', 'username', 'first_name', 'last_name',
            'password', 'password_confirm', 'phone', 'date_of_birth'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
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
        validated_data.pop('password_confirm')
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
    user = UserSerializer(read_only=True)
    parent_name = serializers.CharField(source='parent.full_name', read_only=True)
    
    class Meta:
        model = StudentProfile
        fields = '__all__'


class TeacherProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = TeacherProfile
        fields = '__all__'


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

class StudentDetailSerializer(serializers.Serializer):
    user = UserSerializer(read_only=True)
    student_profile = StudentProfileSerializer(read_only=True)
    
    class Meta:
        model = StudentProfile
        fields = ['user', 'student_profile']
        

class CreateStudentSerializer(serializers.Serializer):
    """Serializer for creating a new student (User + Profile)"""
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False)
    
    admission_number = serializers.CharField(max_length=50)
    current_class = serializers.CharField(max_length=50, required=False, allow_blank=True)
    gender = serializers.ChoiceField(choices=['M', 'F'])
    blood_group = serializers.CharField(max_length=5, required=False, allow_blank=True)
    admission_date = serializers.DateField(required=False, allow_null=True)
    parent_id = serializers.UUIDField(required=False, allow_null=True)
    emergency_contact_name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    emergency_contact_relationship = serializers.CharField(max_length=50, required=False, allow_blank=True)
    medical_conditions = serializers.CharField(required=False, allow_blank=True)
    
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
                parent = User.objects.get(id=value, role='parent')
            except User.DoesNotExist:
                raise serializers.ValidationError("Parent with this ID does not exist.")
        return value
    

@transaction.atomic
def create(self, validated_data):
    password = validated_data.pop('password', 'student123')
    
    profile_fields ={
        'admission_number': validated_data.pop('admission_number'),
        'current_class': validated_data.pop('current_class', ''),
        'gender': validated_data.pop('gender'),
        'blood_group': validated_data.pop('blood_group', ''),
        'admission_date': validated_data.pop('admission_date', None),
        'emergency_contact_name': validated_data.pop('emergency_contact_name', ''),
        'emergency_contact_phone': validated_data.pop('emergency_contact_phone', ''),
        'emergency_contact_relationship': validated_data.pop('emergency_contact_relationship', ''),
        'medical_conditions': validated_data.pop('medical_conditions', ''),
        
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
    
    StudentProfile.objects.create(
        user=user,
        parent=parent,
        **profile_fields
    )
    
    return user

class UpdateStudentSerializer(serializers.Serializer):
    """Serializer for updating an existing student """
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    address = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    
    current_class = serializers.CharField(max_length=50, required=False, allow_blank=True)
    blood_group = serializers.CharField(max_length=5, required=False, allow_blank=True)
    parent_id = serializers.UUIDField(required=False, allow_null=True)
    emergency_contact_name = serializers.CharField(max_length=50, required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(max_length=17, required=False, allow_blank=True)
    medical_conditions = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=['active', 'graduated', 'transferred', 'suspended'], required=False)

@transaction.atomic
def update(self, instance, validated_data):
    user_fields = ['first_name', 'last_name', 'phone', 'date_of_birth', 'address', 'is_active']
    for field in user_fields:
        if field in validated_data:
            setattr(instance.user, field, validated_data[field])
    instance.user.save()
    
    profile = instance.student_profile
    profile_fields = [
        'current_class', 'blood_group', 'emergency_contact_name',
        'emergency_contact_phone', 'emergency_contact_relationship',
        'medical_conditions', 'status'
        
    ]
    
    for field in profile_fields:
        if field in validated_data:
            setattr(profile, field, validated_data[field])
    
    
    if 'parent_id' in validated_data:
        parent_id = validated_data['parent_id']
        if parent_id:
            profile.parent = User.objects.get(id=parent_id, role='parent')
        else:
            profile.parent = None
            
    profile.save()
    return instance



