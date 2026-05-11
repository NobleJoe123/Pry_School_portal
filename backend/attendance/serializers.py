from rest_framework import serializers
from .models import StudentAttendance, TeacherAttendance

class StudentAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='student.full_name')
    class_name = serializers.ReadOnlyField(source='school_class.name')
    term_name = serializers.ReadOnlyField(source='term.name')
    
    class Meta:
        model = StudentAttendance
        fields = '__all__'

class TeacherAttendanceSerializer(serializers.ModelSerializer):
    teacher_name = serializers.ReadOnlyField(source='teacher.full_name')
    
    class Meta:
        model = TeacherAttendance
        fields = '__all__'
