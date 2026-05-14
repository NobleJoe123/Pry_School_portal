from rest_framework import serializers
from .models import FeeType, StudentFee, PaymentRecord, Payroll
from accounts.serializers import UserSerializer

class FeeTypeSerializer(serializers.ModelSerializer):
    level_name = serializers.CharField(source='level.name', read_only=True)

    class Meta:
        model = FeeType
        fields = '__all__'

class StudentFeeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
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
    net_salary = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Payroll
        fields = '__all__'
