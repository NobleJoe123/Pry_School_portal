from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from django.utils import timezone
from .models import AcademicYear, Term, ClassLevel, SchoolClass, Subject, AssessmentType, Assessment, StudentScore, ReportCard, SchoolEvent
from .serializers import (
    AcademicYearSerializer, TermSerializer, 
    ClassLevelSerializer, SchoolClassSerializer, SubjectSerializer,
    AssessmentTypeSerializer, AssessmentSerializer, StudentScoreSerializer,
    ReportCardSerializer, SchoolEventSerializer
)

class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated]

class TermViewSet(viewsets.ModelViewSet):
    queryset = Term.objects.all()
    serializer_class = TermSerializer
    permission_classes = [IsAuthenticated]

class ClassLevelViewSet(viewsets.ModelViewSet):
    queryset = ClassLevel.objects.all()
    serializer_class = ClassLevelSerializer
    permission_classes = [IsAuthenticated]

class SchoolClassViewSet(viewsets.ModelViewSet):
    queryset = SchoolClass.objects.all()
    serializer_class = SchoolClassSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        if user.is_authenticated and user.role == 'teacher':
            queryset = queryset.filter(teacher=user)
        return queryset

class SubjectViewSet(viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated]

class AssessmentTypeViewSet(viewsets.ModelViewSet):
    queryset = AssessmentType.objects.all()
    serializer_class = AssessmentTypeSerializer
    permission_classes = [IsAuthenticated]

class AssessmentViewSet(viewsets.ModelViewSet):
    queryset = Assessment.objects.all()
    serializer_class = AssessmentSerializer
    permission_classes = [IsAuthenticated]

class StudentScoreViewSet(viewsets.ModelViewSet):
    queryset = StudentScore.objects.all()
    serializer_class = StudentScoreSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if user.role == 'student':
            queryset = queryset.filter(student=user)
        elif user.role == 'parent':
            queryset = queryset.filter(student__student_profile__parent=user)
        elif user.role == 'teacher':
            queryset = queryset.filter(assessment__school_class__teacher=user)
            
        class_id = self.request.query_params.get('school_class')
        if class_id:
            queryset = queryset.filter(assessment__school_class_id=class_id)
            
        subject_id = self.request.query_params.get('subject')
        if subject_id:
            queryset = queryset.filter(assessment__subject_id=subject_id)
            
        term_id = self.request.query_params.get('term')
        if term_id:
            if term_id == 'REPLACE_WITH_CURRENT_TERM_ID':
                current_term = Term.objects.filter(is_current=True).first()
                if current_term:
                    queryset = queryset.filter(assessment__term_id=current_term.id)
            else:
                queryset = queryset.filter(assessment__term_id=term_id)
            
        assessment_type_id = self.request.query_params.get('assessment_type')
        if assessment_type_id:
            queryset = queryset.filter(assessment__assessment_type_id=assessment_type_id)
            
        student_id = self.request.query_params.get('student')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
            
        return queryset

    @action(detail=False, methods=['post'])
    def bulk_record(self, request):
        data = request.data
        class_id = data.get('school_class')
        
        if request.user.role == 'teacher':
            from academics.models import SchoolClass
            assigned_class = SchoolClass.objects.filter(id=class_id, teacher=request.user).exists()
            if not assigned_class:
                return Response({'error': 'You do not have permission to enter scores for this class.'}, status=status.HTTP_403_FORBIDDEN)

        subject_id = data.get('subject')
        term_id = data.get('term')
        assessment_type_id = data.get('assessment_type')
        date_administered = data.get('date', timezone.now().date())
        records = data.get('records', [])

        if not term_id or term_id == 'REPLACE_WITH_CURRENT_TERM_ID':
            current_term = Term.objects.filter(is_current=True).first()
            if not current_term:
                return Response({'error': 'No current term configured.'}, status=status.HTTP_400_BAD_REQUEST)
            term_id = current_term.id

        assessment, _ = Assessment.objects.get_or_create(
            school_class_id=class_id,
            subject_id=subject_id,
            term_id=term_id,
            assessment_type_id=assessment_type_id,
            defaults={
                'name': f"Assessment {date_administered}",
                'date_administered': date_administered
            }
        )

        created_count = 0
        for record in records:
            # allow clearing a score by passing null/empty score_obtained
            score = record.get('score_obtained')
            if score is None or score == '':
                StudentScore.objects.filter(student_id=record['student_id'], assessment=assessment).delete()
            else:
                StudentScore.objects.update_or_create(
                    student_id=record['student_id'],
                    assessment=assessment,
                    defaults={
                        'score_obtained': score,
                        'remarks': record.get('remarks', '')
                    }
                )
                created_count += 1
        
        # Send notification to students and parents
        try:
            from accounts.models import User as PortalUser, Notification
            notifications = []
            
            student_ids = [r['student_id'] for r in records if r.get('score_obtained') is not None and r.get('score_obtained') != '']
            students_map = {str(u.id): u for u in PortalUser.objects.filter(id__in=student_ids).select_related('student_profile__parent')}
            
            for record in records:
                student = students_map.get(str(record['student_id']))
                score = record.get('score_obtained')
                if not student or score is None or score == '':
                    continue
                
                subj_name = assessment.subject.name
                ass_name = assessment.assessment_type.name
                
                # Student Notice
                student_msg = f"Your score of {score} has been entered for {subj_name} ({ass_name})."
                notifications.append(
                    Notification(
                        sender=request.user,
                        recipient=student,
                        title=f"Score Entered: {subj_name}",
                        message=student_msg,
                        category='academics',
                        audience='selected'
                    )
                )
                
                # Parent Notice
                if hasattr(student, 'student_profile') and student.student_profile.parent:
                    parent = student.student_profile.parent
                    parent_msg = f"A new grade has been recorded for your child, {student.full_name}: {score} in {subj_name} ({ass_name})."
                    notifications.append(
                        Notification(
                            sender=request.user,
                            recipient=parent,
                            title=f"Academic Grade: {student.first_name}",
                            message=parent_msg,
                            category='academics',
                            audience='selected'
                        )
                    )
            if notifications:
                Notification.objects.bulk_create(notifications)
        except Exception as e:
            print(f"Error sending score notifications: {e}")
        
        return Response({'message': f'Successfully updated {created_count} scores.'})


def send_report_card_notifications(report_card, user, is_new=False, was_published=False):
    try:
        from accounts.models import User as PortalUser, Notification
        notifications = []
        
        # If it was just published
        if report_card.is_published and not was_published:
            student = report_card.student
            term_name = report_card.term.name
            
            # Notify Student
            notifications.append(
                Notification(
                    sender=user,
                    recipient=student,
                    title=f"Report Card Published: {term_name}",
                    message=f"Your terminal report card for {term_name} has been published. You can now view and print it.",
                    category='academics',
                    audience='selected'
                )
            )
            
            # Notify Parent
            if hasattr(student, 'student_profile') and student.student_profile.parent:
                parent = student.student_profile.parent
                notifications.append(
                    Notification(
                        sender=user,
                        recipient=parent,
                        title=f"Report Card Published: {student.first_name}",
                        message=f"The official report card for {student.full_name} for {term_name} has been published by the administration. You can now view it under the Academics section.",
                        category='academics',
                        audience='selected'
                    )
                )
        
        # If a teacher added/updated comments (and it's not published yet)
        elif user.role == 'teacher' and report_card.teacher_remarks:
            # Notify Admins
            admins = PortalUser.objects.filter(role='admin', is_active=True)
            student_name = report_card.student.full_name
            term_name = report_card.term.name
            
            for admin in admins:
                notifications.append(
                    Notification(
                        sender=user,
                        recipient=admin,
                        title=f"Teacher Remark: {student_name}",
                        message=f"Teacher {user.full_name} has added remarks/observations for {student_name} ({term_name}). The report card is ready for administrative review.",
                        category='academics',
                        audience='selected'
                    )
                )
                
        if notifications:
            Notification.objects.bulk_create(notifications)
    except Exception as e:
        print(f"Error dispatching report card notifications: {e}")


class ReportCardViewSet(viewsets.ModelViewSet):
    queryset = ReportCard.objects.all()
    serializer_class = ReportCardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        if user.role == 'student':
            queryset = queryset.filter(student=user, is_published=True)
        elif user.role == 'parent':
            queryset = queryset.filter(student__student_profile__parent=user, is_published=True)
        elif user.role == 'teacher':
            queryset = queryset.filter(student__student_profile__current_class__teacher=user)
            
        student_id = self.request.query_params.get('student')
        if student_id:
            queryset = queryset.filter(student_id=student_id)
            
        school_class_id = self.request.query_params.get('school_class')
        if school_class_id:
            queryset = queryset.filter(student__student_profile__current_class_id=school_class_id)
            
        term_id = self.request.query_params.get('term')
        if term_id:
            if term_id == 'REPLACE_WITH_CURRENT_TERM_ID':
                current_term = Term.objects.filter(is_current=True).first()
                if current_term:
                    queryset = queryset.filter(term_id=current_term.id)
            else:
                queryset = queryset.filter(term_id=term_id)
                
        return queryset

    def perform_create(self, serializer):
        report_card = serializer.save()
        send_report_card_notifications(report_card, self.request.user, is_new=True, was_published=False)
        
    def perform_update(self, serializer):
        old_instance = self.get_object()
        was_published = old_instance.is_published
        report_card = serializer.save()
        send_report_card_notifications(report_card, self.request.user, is_new=False, was_published=was_published)

    @action(detail=False, methods=['post'])
    def bulk_comment_and_publish(self, request):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can perform this action.'}, status=status.HTTP_403_FORBIDDEN)
            
        data = request.data
        term_id = data.get('term')
        records = data.get('records', []) # list of {student_id, admin_remarks, is_published}

        if not term_id or term_id == 'REPLACE_WITH_CURRENT_TERM_ID':
            current_term = Term.objects.filter(is_current=True).first()
            if not current_term:
                return Response({'error': 'No current term configured.'}, status=status.HTTP_400_BAD_REQUEST)
            term_id = current_term.id

        updated_count = 0
        for record in records:
            student_id = record['student_id']
            old_rc = ReportCard.objects.filter(student_id=student_id, term_id=term_id).first()
            was_published = old_rc.is_published if old_rc else False
            
            rc, created = ReportCard.objects.update_or_create(
                student_id=student_id,
                term_id=term_id,
                defaults={
                    'admin_remarks': record.get('admin_remarks', record.get('remarks', '')),
                    'is_published': record.get('is_published', False)
                }
            )
            send_report_card_notifications(rc, request.user, is_new=created, was_published=was_published)
            updated_count += 1
            
        return Response({'message': f'Successfully updated {updated_count} report cards.'})


class SchoolEventViewSet(viewsets.ModelViewSet):
    queryset = SchoolEvent.objects.all()
    serializer_class = SchoolEventSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Non-admins can only see published events
        user = self.request.user
        if user and user.role != 'admin':
            queryset = queryset.filter(is_published=True)
        
        term_id = self.request.query_params.get('term')
        if term_id:
            if term_id == 'REPLACE_WITH_CURRENT_TERM_ID':
                current_term = Term.objects.filter(is_current=True).first()
                if current_term:
                    queryset = queryset.filter(term_id=current_term.id)
            else:
                queryset = queryset.filter(term_id=term_id)
        else:
            # default to current term
            current_term = Term.objects.filter(is_current=True).first()
            if current_term:
                queryset = queryset.filter(term_id=current_term.id)
                
        return queryset

