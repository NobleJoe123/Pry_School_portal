from datetime import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from .models import StudentAttendance, TeacherAttendance
from .serializers import StudentAttendanceSerializer, TeacherAttendanceSerializer

class StudentAttendanceViewSet(viewsets.ModelViewSet):
    queryset = StudentAttendance.objects.all()
    serializer_class = StudentAttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = StudentAttendance.objects.all()

        if user.role == 'student':
            queryset = queryset.filter(student=user)
        elif user.role == 'parent':
            queryset = queryset.filter(student__student_profile__parent=user)
        elif user.role == 'teacher':
            queryset = queryset.filter(school_class__teacher=user)

        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(date=date)

        school_class = self.request.query_params.get('school_class')
        if school_class:
            queryset = queryset.filter(school_class_id=school_class)

        return queryset

    @action(detail=False, methods=['post'])
    def bulk_mark(self, request):
        """Bulk mark attendance for a class on a specific date"""
        data = request.data
        class_id = data.get('school_class')
        term_id = data.get('term')
        if not term_id or term_id == 'REPLACE_WITH_CURRENT_TERM_ID':
            from academics.models import Term
            current_term = Term.objects.filter(is_current=True).first()
            if not current_term:
                return Response({'error': 'No current term configured in academics.'}, status=status.HTTP_400_BAD_REQUEST)
            term_id = current_term.id

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
