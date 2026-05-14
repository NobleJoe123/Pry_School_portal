from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import StudentAttendance, TeacherAttendance
from .serializers import StudentAttendanceSerializer, TeacherAttendanceSerializer

class StudentAttendanceViewSet(viewsets.ModelViewSet):
    queryset = StudentAttendance.objects.all()
    serializer_class = StudentAttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return StudentAttendance.objects.filter(student=user)
        elif user.role == 'parent':
            return StudentAttendance.objects.filter(student__student_profile__parent=user)
        elif user.role == 'teacher':
            # Teachers see attendance for their assigned class
            if hasattr(user, 'teacher_profile') and user.teacher_profile.assigned_class:
                return StudentAttendance.objects.filter(school_class__name=user.teacher_profile.assigned_class)
        return StudentAttendance.objects.all()

    @action(detail=False, methods=['post'])
    def bulk_mark(self, request):
        """Bulk mark attendance for a class on a specific date"""
        data = request.data
        class_id = data.get('school_class')
        term_id = data.get('term')
        date = data.get('date', timezone.now().date())
        attendance_records = data.get('records', []) # List of {student_id, status, remarks}

        created_count = 0
        for record in attendance_records:
            obj, created = StudentAttendance.objects.update_or_create(
                student_id=record['student_id'],
                date=date,
                defaults={
                    'school_class_id': class_id,
                    'term_id': term_id,
                    'status': record['status'],
                    'remarks': record.get('remarks', '')
                }
            )
            created_count += 1
        
        return Response({'message': f'Successfully updated {created_count} records.'})

class TeacherAttendanceViewSet(viewsets.ModelViewSet):
    queryset = TeacherAttendance.objects.all()
    serializer_class = TeacherAttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'teacher':
            return TeacherAttendance.objects.filter(teacher=user)
        return TeacherAttendance.objects.all()
