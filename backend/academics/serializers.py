from rest_framework import serializers
from .models import AcademicYear, Term, ClassLevel, SchoolClass, Subject, AssessmentType, Assessment, StudentScore
from accounts.serializers import UserSerializer

class AcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = '__all__'

class TermSerializer(serializers.ModelSerializer):
    academic_year_name = serializers.ReadOnlyField(source='academic_year.name')
    
    class Meta:
        model = Term
        fields = '__all__'

class ClassLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassLevel
        fields = '__all__'

class SchoolClassSerializer(serializers.ModelSerializer):
    level_name = serializers.ReadOnlyField(source='level.name')
    teacher_name = serializers.ReadOnlyField(source='teacher.full_name')
    
    class Meta:
        model = SchoolClass
        fields = '__all__'

class SubjectSerializer(serializers.ModelSerializer):
    level_name = serializers.ReadOnlyField(source='level.name')
    
    class Meta:
        model = Subject
        fields = '__all__'

class AssessmentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentType
        fields = '__all__'

class AssessmentSerializer(serializers.ModelSerializer):
    type_name = serializers.ReadOnlyField(source='assessment_type.name')
    class_name = serializers.ReadOnlyField(source='school_class.name')
    subject_name = serializers.ReadOnlyField(source='subject.name')
    term_name = serializers.ReadOnlyField(source='term.name')

    class Meta:
        model = Assessment
        fields = '__all__'

class StudentScoreSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='student.full_name')
    assessment_name = serializers.ReadOnlyField(source='assessment.name')

    class Meta:
        model = StudentScore
        fields = '__all__'
