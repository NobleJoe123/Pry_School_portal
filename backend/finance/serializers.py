from rest_framework import serializers
from .models import FeeType, StudentFee, PaymentRecord, Payroll, PayrollAuditLog
from accounts.serializers import UserSerializer

class FeeTypeSerializer(serializers.ModelSerializer):
    level_name = serializers.CharField(source='level.name', read_only=True)

    class Meta:
        model = FeeType
        fields = '__all__'

class StudentFeeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    class_name = serializers.CharField(source='student.student_profile.current_class.name', read_only=True, allow_null=True, default=None)
    fee_type_name = serializers.CharField(source='fee_type.name', read_only=True)
    term_name = serializers.CharField(source='term.name', read_only=True)
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = StudentFee
        fields = '__all__'

class PaymentRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student_fee.student.full_name', read_only=True)
    received_by_name = serializers.CharField(source='received_by.full_name', read_only=True)

    class Meta:
        model = PaymentRecord
        fields = '__all__'

class PayrollSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    staff_name = serializers.CharField(source='teacher.full_name', read_only=True)
    staff_role = serializers.CharField(source='teacher.role', read_only=True)
    staff_id = serializers.SerializerMethodField()
    employment_status = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()
    gross_salary = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_allowances = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_bonuses = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_deductions = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    net_salary = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, allow_null=True)

    def get_staff_id(self, obj):
        profile = getattr(obj.teacher, 'teacher_profile', None)
        return getattr(profile, 'staff_id', None) or obj.teacher.username

    def get_employment_status(self, obj):
        profile = getattr(obj.teacher, 'teacher_profile', None)
        return getattr(profile, 'employment_status', None)

    def get_profile_photo_url(self, obj):
        if obj.teacher and obj.teacher.profile_photo:
            return obj.teacher.profile_photo.url
        return None

    class Meta:
        model = Payroll
        fields = '__all__'


class PayrollAuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True, allow_null=True)

    class Meta:
        model = PayrollAuditLog
        fields = '__all__'


class PayrollDetailSerializer(PayrollSerializer):
    """Extended payroll serializer including nested audit logs — used for payslip detail views."""
    audit_logs = PayrollAuditLogSerializer(many=True, read_only=True)
    school_name = serializers.SerializerMethodField()
    staff_email = serializers.SerializerMethodField()
    staff_phone = serializers.SerializerMethodField()
    staff_department = serializers.SerializerMethodField()
    date_of_joining = serializers.SerializerMethodField()

    def get_school_name(self, obj):
        return "Anyi Primary School"

    def get_staff_email(self, obj):
        return obj.teacher.email if obj.teacher else None

    def get_staff_phone(self, obj):
        return obj.teacher.phone if obj.teacher else None

    def get_staff_department(self, obj):
        return obj.department or (
            'Teaching' if obj.teacher and obj.teacher.role == 'teacher' else 'Administration'
        )

    def get_date_of_joining(self, obj):
        profile = getattr(obj.teacher, 'teacher_profile', None)
        doj = getattr(profile, 'date_of_joining', None)
        return str(doj) if doj else None

    class Meta(PayrollSerializer.Meta):
        pass
