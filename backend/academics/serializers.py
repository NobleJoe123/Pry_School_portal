from rest_framework import serializers
from .models import AcademicYear, Term, ClassLevel, SchoolClass, Subject, AssessmentType, Assessment, StudentScore, ReportCard, SchoolEvent
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
    teacher_title = serializers.SerializerMethodField()
    
    class Meta:
        model = SchoolClass
        fields = '__all__'

    def get_teacher_title(self, obj):
        if obj.teacher and hasattr(obj.teacher, 'teacher_profile'):
            return obj.teacher.teacher_profile.title
        return 'Mr'

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

class AssessmentNestedSerializer(serializers.ModelSerializer):
    assessment_type = AssessmentTypeSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    term = TermSerializer(read_only=True)

    class Meta:
        model = Assessment
        fields = ['id', 'name', 'assessment_type', 'subject', 'term']

class StudentScoreSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='student.full_name')
    assessment_name = serializers.ReadOnlyField(source='assessment.name')

    class Meta:
        model = StudentScore
        fields = '__all__'

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep['assessment'] = AssessmentNestedSerializer(instance.assessment).data
        return rep


class ReportCardSerializer(serializers.ModelSerializer):
    student_name = serializers.ReadOnlyField(source='student.full_name')
    student_admission = serializers.ReadOnlyField(source='student.student_profile.admission_number')
    term_name = serializers.ReadOnlyField(source='term.name')
    academic_year_name = serializers.ReadOnlyField(source='term.academic_year.name')

    class Meta:
        model = ReportCard
        fields = '__all__'

    def validate(self, attrs):
        request = self.context.get('request')
        if request and request.user:
            user = request.user
            if user.role == 'teacher':
                if self.instance:
                    if 'admin_remarks' in attrs and attrs['admin_remarks'] != self.instance.admin_remarks:
                        raise serializers.ValidationError({'admin_remarks': 'Teachers cannot modify admin remarks.'})
                    if 'is_published' in attrs and attrs['is_published'] != self.instance.is_published:
                        raise serializers.ValidationError({'is_published': 'Teachers cannot change the publication status.'})
                else:
                    if attrs.get('admin_remarks') is not None:
                        raise serializers.ValidationError({'admin_remarks': 'Teachers cannot create admin remarks.'})
                    if attrs.get('is_published', False) is not False:
                        raise serializers.ValidationError({'is_published': 'Teachers cannot publish report cards.'})
        return attrs


class SchoolEventSerializer(serializers.ModelSerializer):
    term_name = serializers.ReadOnlyField(source='term.name')
    academic_year_name = serializers.ReadOnlyField(source='term.academic_year.name')

    class Meta:
        model = SchoolEvent
        fields = '__all__'

