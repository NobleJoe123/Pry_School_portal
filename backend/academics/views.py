from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.decorators import action
from django.utils import timezone
from .models import AcademicYear, Term, ClassLevel, SchoolClass, Subject, AssessmentType, Assessment, StudentScore, ReportCard, SchoolEvent, LessonMaterial
from .serializers import (
    AcademicYearSerializer, TermSerializer,
    ClassLevelSerializer, SchoolClassSerializer, SubjectSerializer,
    AssessmentTypeSerializer, AssessmentSerializer, StudentScoreSerializer,
    ReportCardSerializer, SchoolEventSerializer, LessonMaterialSerializer
)

class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.all()
    serializer_class = AcademicYearSerializer
    permission_classes = [IsAuthenticated]

class TermViewSet(viewsets.ModelViewSet):
    queryset = Term.objects.all()
    serializer_class = TermSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'], url_path='set-current')
    def set_current(self, request, pk=None):
        """
        Mark this term as active/current, update resumption_date if provided,
        dispatch notifications to parents & teachers, and auto-generate/refresh
        new term school fees for all active enrolled students.
        """
        term = self.get_object()
        resumption_date_str = request.data.get('resumption_date') or request.data.get('start_date')
        
        if resumption_date_str:
            try:
                from datetime import datetime
                if isinstance(resumption_date_str, str):
                    term.resumption_date = datetime.strptime(resumption_date_str, '%Y-%m-%d').date()
                else:
                    term.resumption_date = resumption_date_str
            except Exception as e:
                print(f"Resumption date parsing error: {e}")

        term.is_current = True
        term.save()

        # 1. Dispatch Automated In-App Notifications to Parents & Teachers
        notifications_count = 0
        resumption_date_val = term.get_resumption_date()
        formatted_resumption = resumption_date_val.strftime('%A, %B %d, %Y') if resumption_date_val else "TBA"

        try:
            from accounts.models import Notification, User
            recipients = User.objects.filter(role__in=['teacher', 'parent'], is_active=True)
            
            notif_list = [
                Notification(
                    sender=request.user if request.user.is_authenticated else None,
                    recipient=user,
                    title=f"Academic Term Update: {term.name}",
                    message=f"Notice: {term.name} ({term.academic_year.name}) is now active. School resumption date is set for {formatted_resumption}.",
                    category='academics',
                    audience='all'
                )
                for user in recipients
            ]
            if notif_list:
                Notification.objects.bulk_create(notif_list)
                notifications_count = len(notif_list)
        except Exception as e:
            print(f"Error creating term notifications: {e}")

        # 2. Auto-Generate / Refresh School Fees for the Active Term
        fees_generated_count = 0
        try:
            from accounts.models import User
            from finance.models import FeeType, StudentFee
            
            active_students = User.objects.filter(
                role='student',
                is_active=True,
                student_profile__current_class__isnull=False
            ).select_related('student_profile__current_class__level', 'student_profile__parent')

            parent_notifications = []

            for student in active_students:
                level = student.student_profile.current_class.level
                fee_types = FeeType.objects.filter(level=level)

                for ft in fee_types:
                    sf, created = StudentFee.objects.get_or_create(
                        student=student,
                        fee_type=ft,
                        term=term,
                        defaults={'status': 'outstanding', 'amount_paid': 0}
                    )
                    if created:
                        fees_generated_count += 1
                        parent = student.student_profile.parent
                        if parent:
                            parent_notifications.append(
                                Notification(
                                    sender=request.user if request.user.is_authenticated else None,
                                    recipient=parent,
                                    title=f"New School Fees: {term.name}",
                                    message=f"School fees for {term.name} ({ft.name} - ₦{ft.amount:,.2f}) have been published for {student.full_name}.",
                                    category='finance',
                                    audience='selected'
                                )
                            )

            if parent_notifications:
                Notification.objects.bulk_create(parent_notifications)
        except Exception as e:
            print(f"Error generating term student fees: {e}")

        serializer = self.get_serializer(term)
        return Response({
            'message': f"{term.name} ({term.academic_year.name}) is now active. Resumption date set for {formatted_resumption}.",
            'term': serializer.data,
            'notifications_sent': notifications_count,
            'fees_generated': fees_generated_count
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='transition-vacation')
    def transition_vacation(self, request, pk=None):
        """
        Transitions the specified term into vacation period, calculates the next term's
        resumption date, and broadcasts notifications to teachers and parents with the
        added message of when the next term begins.
        """
        term = self.get_object()
        next_term = term.get_next_term()
        
        custom_resumption = request.data.get('resumption_date')
        if custom_resumption:
            try:
                from datetime import datetime
                resumption_val = datetime.strptime(custom_resumption, '%Y-%m-%d').date()
            except Exception:
                resumption_val = next_term.get_resumption_date() if next_term else None
        else:
            resumption_val = next_term.get_resumption_date() if next_term else None

        formatted_resumption = resumption_val.strftime('%A, %B %d, %Y') if resumption_val else "a date to be announced soon"

        # Dispatch vacation notification to teachers and parents
        notifications_count = 0
        try:
            from accounts.models import Notification, User
            recipients = User.objects.filter(role__in=['teacher', 'parent'], is_active=True)
            
            notif_list = [
                Notification(
                    sender=request.user if request.user.is_authenticated else None,
                    recipient=user,
                    title=f"Vacation Period: {term.name} Ended",
                    message=f"The {term.name} ({term.academic_year.name}) has officially come to an end and the vacation period has commenced. Please note that the next term begins on {formatted_resumption}.",
                    category='academics',
                    audience='all'
                )
                for user in recipients
            ]
            if notif_list:
                Notification.objects.bulk_create(notif_list)
                notifications_count = len(notif_list)
        except Exception as e:
            print(f"Error creating vacation notifications: {e}")

        return Response({
            'message': f"{term.name} vacation period initiated. Resumption notice sent for {formatted_resumption}.",
            'next_term_resumption': str(resumption_val) if resumption_val else None,
            'notifications_sent': notifications_count
        }, status=status.HTTP_200_OK)

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
        # Teachers only see their own class; admins see all
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
        from django.db.models import Exists, OuterRef

        if user.role == 'student':
            queryset = queryset.filter(
                student=user
            ).filter(
                Exists(
                    ReportCard.objects.filter(
                        student_id=OuterRef('student_id'),
                        term_id=OuterRef('assessment__term_id'),
                        is_published=True
                    )
                )
            )
        elif user.role == 'parent':
            queryset = queryset.filter(
                student__student_profile__parent=user
            ).filter(
                Exists(
                    ReportCard.objects.filter(
                        student_id=OuterRef('student_id'),
                        term_id=OuterRef('assessment__term_id'),
                        is_published=True
                    )
                )
            )
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
        elif user.role == 'teacher':
            # Notify Admins
            admins = PortalUser.objects.filter(role='admin', is_active=True)
            student_name = report_card.student.full_name
            term_name = report_card.term.name
            
            for admin in admins:
                notifications.append(
                    Notification(
                        sender=user,
                        recipient=admin,
                        title=f"Report Submitted: {student_name}",
                        message=f"Teacher {user.full_name} has submitted/updated the report card details for {student_name} ({term_name}). Please review and publish the report card.",
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
        records = data.get('records', [])  # list of {student_id, admin_remarks, is_published}

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

            defaults = {
                'admin_remarks': record.get('admin_remarks', record.get('remarks', '')),
                'is_published': record.get('is_published', False),
            }
            if 'psychomotor' in record:
                defaults['psychomotor'] = record['psychomotor']

            rc, created = ReportCard.objects.update_or_create(
                student_id=student_id,
                term_id=term_id,
                defaults=defaults
            )
            send_report_card_notifications(rc, request.user, is_new=created, was_published=was_published)
            updated_count += 1

        return Response({'message': f'Successfully updated {updated_count} report cards.'})


class LessonMaterialViewSet(viewsets.ModelViewSet):
    """CRUD for lesson notes/plans. Teachers own their materials;
       admins can view all and change status."""

    queryset = LessonMaterial.objects.select_related(
        'teacher', 'school_class', 'subject'
    ).all()
    serializer_class = LessonMaterialSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs  = super().get_queryset()
        user = self.request.user

        if user.role == 'teacher':
            qs = qs.filter(teacher=user)
        # admin & other roles see all

        # Optional filter params
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        school_class = self.request.query_params.get('school_class')
        if school_class:
            qs = qs.filter(school_class_id=school_class)

        subject = self.request.query_params.get('subject')
        if subject:
            qs = qs.filter(subject_id=subject)

        return qs

    def get_parser_classes(self):
        """Allow multipart (file uploads) alongside JSON."""
        from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
        return [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)

    def perform_update(self, serializer):
        # Teachers can edit their own materials until admin approval.
        instance = self.get_object()
        user = self.request.user
        if user.role == 'teacher':
            from rest_framework.exceptions import PermissionDenied
            if instance.teacher != user:
                raise PermissionDenied("You can only edit your own materials.")
            if instance.status == 'approved':
                raise PermissionDenied("Approved materials cannot be edited.")
        serializer.save()

    def perform_destroy(self, instance):
        user = self.request.user
        if user.role == 'teacher' and instance.teacher != user:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You can only delete your own materials.")
        instance.delete()

    @action(detail=True, methods=['patch'], url_path='set-status')
    def set_status(self, request, pk=None):
        """Admin-only: approve or reject a submitted material."""
        if request.user.role != 'admin':
            return Response(
                {'error': 'Only admins can approve or reject materials.'},
                status=status.HTTP_403_FORBIDDEN
            )
        instance = self.get_object()
        new_status = request.data.get('status')
        if new_status not in ('approved', 'rejected', 'submitted', 'draft'):
            return Response(
                {'error': 'Invalid status value.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.status = new_status
        instance.save(update_fields=['status'])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


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
