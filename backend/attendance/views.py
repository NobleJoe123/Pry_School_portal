from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from .models import StudentAttendance, TeacherAttendance, AttendanceSubmission
from .serializers import StudentAttendanceSerializer, TeacherAttendanceSerializer, AttendanceSubmissionSerializer

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
        """Bulk mark and submit attendance for a class on a specific date."""
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
        attendance_records = data.get('records', [])  # [{student_id, status, remarks}]

        # Check if this class/date is locked by a previous submission
        existing_submission = AttendanceSubmission.objects.filter(
            school_class_id=class_id, date=date, is_locked=True
        ).first()
        if existing_submission:
            return Response(
                {'error': 'Attendance for this class and date has already been submitted and locked.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_count = 0
        for record in attendance_records:
            obj, created = StudentAttendance.objects.update_or_create(
                student_id=record['student_id'],
                date=date,
                defaults={
                    'school_class_id': class_id,
                    'term_id': term_id,
                    'status': record['status'],
                    'remarks': record.get('remarks', ''),
                    'is_locked': True,  # lock on submission
                }
            )
            created_count += 1

        # Create the submission record (lock)
        AttendanceSubmission.objects.update_or_create(
            school_class_id=class_id,
            date=date,
            defaults={
                'submitted_by': request.user,
                'is_locked': True,
            }
        )

        return Response({'message': f'Attendance submitted and locked for {created_count} pupils.'})

    @action(detail=False, methods=['get'])
    def submission_status(self, request):
        """Check if a class has submitted attendance for a given date."""
        class_id = request.query_params.get('school_class')
        date = request.query_params.get('date', timezone.now().date())
        submission = AttendanceSubmission.objects.filter(
            school_class_id=class_id, date=date
        ).first()
        if submission:
            return Response({
                'submitted': True,
                'is_locked': submission.is_locked,
                'submitted_by': submission.submitted_by.full_name if submission.submitted_by else None,
                'submitted_at': submission.submitted_at,
            })
        return Response({'submitted': False, 'is_locked': False})

    @action(detail=False, methods=['post'])
    def reopen(self, request):
        """Admin action to reopen a locked attendance submission."""
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can reopen attendance.'}, status=status.HTTP_403_FORBIDDEN)
        class_id = request.data.get('school_class')
        date = request.data.get('date')
        submission = AttendanceSubmission.objects.filter(school_class_id=class_id, date=date).first()
        if not submission:
            return Response({'error': 'No submission found for this class and date.'}, status=status.HTTP_404_NOT_FOUND)
        submission.is_locked = False
        submission.reopened_by = request.user
        submission.save()
        # Unlock all attendance records for that class/date
        StudentAttendance.objects.filter(school_class_id=class_id, date=date).update(is_locked=False)
        return Response({'message': 'Attendance reopened. Teacher can now modify it.'})


class AttendanceSubmissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AttendanceSubmission.objects.all()
    serializer_class = AttendanceSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(date=date)
        school_class = self.request.query_params.get('school_class')
        if school_class:
            queryset = queryset.filter(school_class_id=school_class)
        return queryset


class TeacherAttendanceViewSet(viewsets.ModelViewSet):
    queryset = TeacherAttendance.objects.all()
    serializer_class = TeacherAttendanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'teacher':
            return TeacherAttendance.objects.filter(teacher=user)
        return TeacherAttendance.objects.all()
