from rest_framework import serializers
from .models import FeeType, StudentFee, PaymentRecord, Payroll

class FeeTypeSerializer(serializers.ModelSerializer):
    level_name = serializers.ReadOnlyField(source='level.name')
    class Meta:
        model = FeeType
        fields = '__all__'

class StudentFeeSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='student.full_name')
    fee_type_name = serializers.ReadOnlyField(source='fee_type.name')
    term_name = serializers.ReadOnlyField(source='term.name')
    balance = serializers.ReadOnlyField()

    class Meta:
        model = StudentFee
        fields = '__all__'

class PaymentRecordSerializer(serializers.ModelSerializer):
    received_by_name = serializers.ReadOnlyField(source='received_by.full_name')
    class Meta:
        model = PaymentRecord
        fields = '__all__'

class PayrollSerializer(serializers.ModelSerializer):
    teacher_name = serializers.ReadOnlyField(source='teacher.full_name')
    net_salary = serializers.ReadOnlyField()
    class Meta:
        model = Payroll
        fields = '__all__'
