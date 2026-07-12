from rest_framework import serializers
from .models import AcademicYear, Term, ClassLevel, SchoolClass, Subject, AssessmentType, Assessment, StudentScore, ReportCard, SchoolEvent, LessonMaterial
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
    class_size = serializers.SerializerMethodField()
    class_position = serializers.SerializerMethodField()

    class Meta:
        model = ReportCard
        fields = '__all__'

    def get_class_size(self, obj):
        profile = getattr(obj.student, 'student_profile', None)
        if profile and profile.current_class:
            from accounts.models import StudentProfile
            return StudentProfile.objects.filter(current_class=profile.current_class, status='active').count()
            # Return 0 if not assigned or inactive
        return 0

    def get_class_position(self, obj):
        profile = getattr(obj.student, 'student_profile', None)
        if not profile or not profile.current_class:
            return 0
        term = obj.term
        from accounts.models import StudentProfile
        class_students = list(StudentProfile.objects.filter(current_class=profile.current_class, status='active').values_list('user_id', flat=True))
        from django.db.models import Sum
        from academics.models import StudentScore
        student_scores = StudentScore.objects.filter(
            student_id__in=class_students,
            assessment__term=term
        ).values('student_id', 'assessment__subject_id').annotate(
            subject_total=Sum('score_obtained')
        )
        totals = {}
        for item in student_scores:
            s_id = item['student_id']
            totals[s_id] = totals.get(s_id, 0.0) + float(item['subject_total'] or 0.0)
        sorted_students = sorted(class_students, key=lambda sid: totals.get(sid, 0.0), reverse=True)
        try:
            position = sorted_students.index(obj.student.id) + 1
            return position
        except ValueError:
            return 0

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


class LessonMaterialSerializer(serializers.ModelSerializer):
    teacher_name      = serializers.ReadOnlyField(source='teacher.full_name')
    class_name        = serializers.ReadOnlyField(source='school_class.name')
    subject_name      = serializers.ReadOnlyField(source='subject.name')
    file_url          = serializers.SerializerMethodField()
    file_size         = serializers.SerializerMethodField()

    class Meta:
        model  = LessonMaterial
        fields = [
            'id', 'teacher', 'teacher_name',
            'school_class', 'class_name',
            'subject', 'subject_name',
            'week', 'topic', 'objectives', 'activities', 'evaluation',
            'file', 'file_url', 'file_size',
            'status', 'created_at', 'updated_at',
        ]
        read_only_fields = ['teacher', 'created_at', 'updated_at']

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None

    def get_file_size(self, obj):
        if obj.file:
            try:
                size = obj.file.size
                if size < 1024:
                    return f"{size} B"
                elif size < 1024 * 1024:
                    return f"{size / 1024:.1f} KB"
                else:
                    return f"{size / (1024 * 1024):.1f} MB"
            except Exception:
                return None
        return None

    def validate_status(self, value):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            # Teachers can only set draft or submitted
            if user.role == 'teacher' and value in ('approved', 'rejected'):
                raise serializers.ValidationError(
                    "Teachers cannot approve or reject materials."
                )
        return value
