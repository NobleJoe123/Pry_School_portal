from rest_framework import status, generics, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.views import APIView
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import authenticate
from django.db.models import Count
from django.utils import timezone
from datetime import datetime, timedelta
from django.db import transaction
from .models import User, StudentProfile, TeacherProfile, ParentProfile, EnrollmentRequest, Notification
from .serializers import (
    UserSerializer, RegisterSerializer, StudentProfileSerializer,
    TeacherProfileSerializer, ParentProfileSerializer, EnrollmentRequestSerializer,
    ChangePasswordSerializer, CreateStudentSerializer, StudentDetailSerializer, 
    StudentListSerializer, UpdateStudentSerializer, CreateTeacherSerializer, 
    TeacherDetailSerializer, TeacherListSerializer, ParentDetailSerializer, 
    UpdateTeacherSerializer, CreateParentSerializer, UpdateParentSerializer, 
    NotificationSerializer, NotificationCreateSerializer
)

from .permissions import IsAdminOrReadOnly

# Cookie Settings

REFRESH_COOKIE_NAME = 'refresh_token'

COOKIE_SETTINGS = {
    'httponly': True,
    'secure' : False,
    'samesite': 'Lax',
    'max_age': 60 * 60 * 24 * 7, 
    'path' : '/',
}

class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Register a new parent user
    """
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        
        response = Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'access_token': access,
            'message': 'Registration sucessfull'
        }, status=status.HTTP_201_CREATED)
        
        response.set_cookie(key=REFRESH_COOKIE_NAME, value=str(refresh), **COOKIE_SETTINGS)
        return response


class LoginView(APIView):
    """
    POST /api/auth/login/
    Login with email, username, or admission number
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        identifier = request.data.get('identifier', request.data.get('email', '')).strip()
        password = request.data.get('password')
        
        if not identifier or not password:
            return Response(
                {'error': 'Please provide both credentials and password.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Authenticate user - try Email, then Username, then Admission Number
        user = User.objects.filter(email__iexact=identifier).first()
        
        if not user:
            user = User.objects.filter(username__iexact=identifier).first()
            
        if not user:
            # Check if it's an admission number
            user = User.objects.filter(student_profile__admission_number__iexact=identifier).first()
        
        if user is None or not user.check_password(password):
            enrollment = EnrollmentRequest.objects.filter(parent_email__iexact=identifier).order_by('-created_at').first()
            if enrollment:
                from django.contrib.auth.hashers import check_password
                if check_password(password, enrollment.password):
                    if enrollment.status == 'pending':
                        return Response({
                            'pending_enrollment': True,
                            'status': 'pending',
                            'message': 'Your enrollment request is pending admin approval.'
                        }, status=status.HTTP_200_OK)
                    elif enrollment.status == 'denied':
                        return Response({
                            'pending_enrollment': True,
                            'status': 'denied',
                            'message': 'Your enrollment request has been denied.'
                        }, status=status.HTTP_200_OK)
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.is_active:
            return Response(
                {'error': 'This account has been deactivated.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        access = str(refresh.access_token)
        
        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        response = Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'access_token': access,
            'message': 'Login successful!'
        }, status=status.HTTP_200_OK)
        
        response.set_cookie(key=REFRESH_COOKIE_NAME, value=str(refresh), **COOKIE_SETTINGS)
        return response




class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Logout user by blacklisting refresh token
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
        
        try:
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except TokenError:
            pass
        
        response = Response(
                {'message': 'Logout successful!'},
                status=status.HTTP_200_OK
        )
        
        response.delete_cookie(REFRESH_COOKIE_NAME, path='/', samesite='Lax')
        return response
    

class TokenRefreshCookieView(APIView):
    """"
    POST /api/auth/token/refresh/
    Refresh JWT token
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME)
        
        
        if not refresh_token:
            return Response(
                {'error': 'No refresh token found. Please log in again. '},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
      
        
        try:
            refresh = RefreshToken(refresh_token)
            access = str(refresh.access_token)
            
            response = Response(
                {'access_token': access},
                status=status.HTTP_200_OK
            )
            
            refresh.set_jti()
            refresh.set_exp()
            response.set_cookie(key="refresh_token", value=str(refresh), **COOKIE_SETTINGS)
            return response
        
        except TokenError:
            response = Response(
                {'error': 'Refresh token is invalid or expired. Please log in again'},
                status=status.HTTP_401_UNAUTHORIZED
            )
            response.delete_cookie(REFRESH_COOKIE_NAME, path='/')
            return response



class UserProfileView(APIView):
    """
    GET /api/auth/profile/
    Get current user profile
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        user_data = UserSerializer(user, context={'request': request}).data
        
        # Add role-specific profile data
        profile_data = None
        if hasattr(user, 'student_profile'):
            profile_data = StudentProfileSerializer(user.student_profile).data
        elif hasattr(user, 'teacher_profile'):
            profile_data = TeacherProfileSerializer(user.teacher_profile).data
        elif hasattr(user, 'parent_profile'):
            profile_data = ParentProfileSerializer(user.parent_profile).data
        
        return Response({
            'user': user_data,
            'profile': profile_data
        })
    
    def patch(self, request):
        """Update user profile"""
        serializer = UserSerializer(
            instance=request.user,
            data=request.data,
            partial=True,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'user': serializer.data,
                'message': 'Profile updated successfully!'
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Change user password
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response({
                'message': 'Password changed successfully!'
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Simple function-based view for testing
@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint"""
    return Response({'status': 'ok', 'message': 'API is running'})



# Student management Views

class StudentViewSet(viewsets.ModelViewSet):
    """
    viewses for managing students using CRUD
     list: GET /api/students/
    create: POST /api/students/
    retrieve: GET /api/students/{id}/
    update: PUT/PATCH /api/students/{id}/
    destroy: DELETE /api/students/{id}/
    """
    
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['first_name', 'last_name', 'email', 'student_profile__admission_number']
    ordering_fields = ['date_joined', 'first_name', 'last_name']
    ordering = ['-date_joined']
    
    def get_queryset(self):
        queryset = User.objects.filter(role='student').select_related(
            'student_profile', 'student_profile__parent'
        )
        class_name = self.request.query_params.get('class')
        student_status = self.request.query_params.get('status')
        parent_id = self.request.query_params.get('parent_id')
        
        if class_name: queryset = queryset.filter(student_profile__current_class__name=class_name)
        if student_status: queryset = queryset.filter(student_profile__status=student_status)
        if parent_id: queryset = queryset.filter(student_profile__parent_id=parent_id)
        return queryset

        
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateStudentSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateStudentSerializer
        elif self.action == 'retrieve':
            return StudentDetailSerializer
        return StudentListSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        admission_number = user.student_profile.admission_number
        
        print("\n" + "="*50)
        print(f"NEW STUDENT CREATED: {user.full_name}")
        print(f"ADMISSION NUMBER: {admission_number}")
        if serializer.context.get('generated_password'):
            print("PASSWORD: Provided by admin")
        else:
            print("LOGIN: Disabled; managed through parent account")
        print("="*50 + "\n")
        
        return Response({
            'message': 'Student created successfully!',
            'student': UserSerializer(user, context={'request': request}).data,
            'credentials': {
                'admission_number': admission_number,
                'login_enabled': bool(serializer.context.get('generated_password'))
            }
        }, status=status.HTTP_201_CREATED)
        
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
            
        return Response({
            'message': 'Student updated successfully!',
            'student': UserSerializer(user, context={'request': request}).data
            })
            
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
            
        return Response({
            'message': 'Student deactivated successfully!'
            }, status=status.HTTP_200_OK)
            
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get student statistics"""
        queryset = self.get_queryset()
        return Response({
            'total_students': queryset.count(),
            'active_students': queryset.filter(student_profile__status='active').count(),
            'by_class': list(
                queryset
                .exclude(student_profile__current_class=None)
                .values('student_profile__current_class__name')
                .annotate(count=Count('id'))
            )
        })

    @action(detail=True, methods=['post'])
    def upload_photo(self, request, pk=None):
        student = self.get_object()
        photo = request.data.get('profile_photo') or request.FILES.get('profile_photo')
        if not photo:
            return Response({'error': 'No profile photo provided'}, status=status.HTTP_400_BAD_REQUEST)
        student.profile_photo = photo
        student.save(update_fields=['profile_photo'])
        return Response({
            'message': 'Profile photo uploaded successfully!',
            'profile_photo_url': request.build_absolute_uri(student.profile_photo.url) if student.profile_photo else None
        })
    
    
# TEACHER MANAGEMENT VIEWS

class TeacherViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing teachers
    """
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['first_name', 'last_name', 'email', 'teacher_profile__staff_id']
    ordering_fields = ['date_joined', 'first_name', 'last_name']
    ordering = ['-date_joined']
    
    def get_queryset(self):
        queryset = User.objects.filter(role='teacher').select_related('teacher_profile')
        employment_status = self.request.query_params.get('employment_status', None)
        if employment_status:
            queryset = queryset.filter(teacher_profile__employment_status=employment_status)
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateTeacherSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateTeacherSerializer
        elif self.action == 'retrieve':
            return TeacherDetailSerializer
        return TeacherListSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'message': 'Teacher created successfully!',
            'teacher': UserSerializer(user, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'message': 'Teacher updated successfully!',
            'teacher': UserSerializer(user, context={'request': request}).data
        })
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        
        return Response({
            'message': 'Teacher deactivated successfully!'
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get teacher statistics"""
        queryset = self.get_queryset()
        total = queryset.count()
        by_status = queryset.values('teacher_profile__employment_status').annotate(count=Count('id'))
        
        return Response({
            'total_teachers': total,
            'by_employment_status': list(by_status)
        })


# PARENT MANAGEMENT VIEWS

class ParentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing parents
    """
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    ordering = ['-date_joined']
    
    def get_queryset(self):
        return User.objects.filter(role='parent').select_related('parent_profile').prefetch_related('children')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateParentSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateParentSerializer
        elif self.action in ['retrieve', 'list']:
            return ParentDetailSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'message': 'Parent created successfully!',
            'parent': UserSerializer(user, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'message': 'Parent updated successfully!',
            'parent': UserSerializer(user, context={'request': request}).data
        })

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        
        return Response({
            'message': 'Parent deactivated successfully!'
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'])
    def link_students(self, request):
        admission_numbers = request.data.get('admission_numbers', [])
        if not admission_numbers:
            return Response({'error': 'No admission numbers provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        if user.role != 'parent':
            return Response({'error': 'Only parents can link students'}, status=status.HTTP_403_FORBIDDEN)
            
        linked_count = 0
        not_found = []
        for adm in admission_numbers:
            try:
                student_profile = StudentProfile.objects.get(admission_number__iexact=adm)
                student_profile.parent = user
                student_profile.save()
                linked_count += 1
            except StudentProfile.DoesNotExist:
                not_found.append(adm)
                
        return Response({
            'message': f'Successfully linked {linked_count} student(s).',
            'not_found': not_found
        })


# DASHBOARD VIEWS

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def dashboard_stats(request):
    """
    GET /api/dashboard/stats/
    Primary School Operations Center – comprehensive stats for admin dashboard
    """
    from academics.models import SchoolClass, Term
    from django.db.models import Sum, Q

    today = timezone.now().date()

    # ── Core Counts ─────────────────────────────────────────────────────────
    total_pupils = User.objects.filter(role='student', is_active=True).count()
    total_teachers = User.objects.filter(role='teacher', is_active=True).count()
    total_parents = User.objects.filter(role='parent', is_active=True).count()

    # Active classes (have at least one student assigned)
    active_classes = SchoolClass.objects.annotate(
        pupil_count=Count('students')
    ).filter(pupil_count__gt=0).count()

    total_classes = SchoolClass.objects.count()

    # New admissions this week
    week_ago = timezone.now() - timedelta(days=7)
    new_admissions = StudentProfile.objects.filter(
        admission_date__gte=week_ago
    ).count()

    # Pending enrollment requests
    pending_enrollments = EnrollmentRequest.objects.filter(status='pending').count()

    # ── Attendance (today) ───────────────────────────────────────────────────
    try:
        from attendance.models import StudentAttendance
        todays_attendance = StudentAttendance.objects.filter(date=today)
        attendance_present = todays_attendance.filter(status='present').count()
        attendance_absent = todays_attendance.filter(status='absent').count()
        attendance_late = todays_attendance.filter(status='late').count()
        classes_submitted_attendance = todays_attendance.values('school_class').distinct().count()
        attendance_rate = round(
            (attendance_present / (attendance_present + attendance_absent + attendance_late)) * 100
        ) if (attendance_present + attendance_absent + attendance_late) > 0 else 0
    except Exception:
        attendance_present = attendance_absent = attendance_late = classes_submitted_attendance = attendance_rate = 0

    # ── Finance ──────────────────────────────────────────────────────────────
    try:
        from finance.models import StudentFee, PaymentRecord
        outstanding_fees_count = StudentFee.objects.filter(status__in=['outstanding', 'partial']).count()
        total_collected_today = PaymentRecord.objects.filter(
            date=today
        ).aggregate(total=Sum('amount'))['total'] or 0
        # Fee defaulters: students with outstanding status
        fee_defaulters = StudentFee.objects.filter(
            status='outstanding'
        ).select_related('student__student_profile').values(
            'student__first_name', 'student__last_name',
            'student__student_profile__admission_number',
            'student__student_profile__current_class__name',
            'fee_type__name', 'balance'
        )[:10]
        fee_defaulters_list = [
            {
                'name': f"{d['student__first_name']} {d['student__last_name']}",
                'admission_number': d['student__student_profile__admission_number'],
                'class_name': d['student__student_profile__current_class__name'] or 'Unassigned',
                'fee_type': d['fee_type__name'],
                'balance': float(d['balance']),
            }
            for d in fee_defaulters
        ]
    except Exception:
        outstanding_fees_count = 0
        total_collected_today = 0
        fee_defaulters_list = []

    # ── Current Term ─────────────────────────────────────────────────────────
    current_term_data = None
    try:
        current_term = Term.objects.filter(is_current=True).select_related('academic_year').first()
        if current_term:
            current_term_data = {
                'id': str(current_term.id),
                'name': current_term.name,
                'academic_year': current_term.academic_year.name if current_term.academic_year else '',
                'start_date': str(current_term.start_date),
                'end_date': str(current_term.end_date),
            }
    except Exception:
        pass

    # ── Students by Class ────────────────────────────────────────────────────
    students_by_class = list(
        StudentProfile.objects.exclude(current_class=None).values('current_class__name').annotate(
            count=Count('id')
        ).order_by('current_class__name')
    )
    students_by_class_dict = {
        item['current_class__name']: item['count'] for item in students_by_class
    }

    # ── Class Overview (for operations widget) ───────────────────────────────
    classes_overview = []
    try:
        for sc in SchoolClass.objects.select_related('level').prefetch_related('students')[:12]:
            pupil_count = sc.students.filter(status='active').count()
            teacher_name = None
            try:
                from accounts.models import TeacherProfile as TP
                tp = TP.objects.filter(user__role='teacher').first()
                if sc.teacher_id:
                    teacher_name = User.objects.filter(id=sc.teacher_id).values_list('first_name', 'last_name').first()
                    if teacher_name:
                        teacher_name = f"{teacher_name[0]} {teacher_name[1]}"
            except Exception:
                pass
            classes_overview.append({
                'id': str(sc.id),
                'name': sc.name,
                'level': sc.level.name if hasattr(sc, 'level') and sc.level else '',
                'pupil_count': pupil_count,
                'teacher_name': teacher_name,
            })
    except Exception:
        pass

    # ── Recent Activity Feed ─────────────────────────────────────────────────
    activity_feed = []
    try:
        recent_admissions = StudentProfile.objects.select_related('user').order_by('-admission_date')[:5]
        for sp in recent_admissions:
            activity_feed.append({
                'type': 'admission',
                'title': f"{sp.user.full_name} enrolled",
                'subtitle': sp.admission_number,
                'time': sp.admission_date.isoformat() if sp.admission_date else '',
                'color': 'emerald',
            })
        recent_enrollments = EnrollmentRequest.objects.filter(
            status='pending'
        ).order_by('-created_at')[:3]
        for er in recent_enrollments:
            activity_feed.append({
                'type': 'enrollment_request',
                'title': f"Enrollment request from {er.parent_first_name} {er.parent_last_name}",
                'subtitle': f"{len(er.students_data)} pupil(s)",
                'time': er.created_at.isoformat(),
                'color': 'amber',
            })
        activity_feed.sort(key=lambda x: x['time'], reverse=True)
        activity_feed = activity_feed[:8]
    except Exception:
        pass

    return Response({
        # Summary counts
        'total_pupils': total_pupils,
        'total_teachers': total_teachers,
        'total_parents': total_parents,
        'active_classes': active_classes,
        'total_classes': total_classes,
        'new_admissions': new_admissions,
        'pending_enrollments': pending_enrollments,
        # Backwards compat aliases
        'total_students': total_pupils,
        'active_students': StudentProfile.objects.filter(status='active').count(),

        # Attendance
        'attendance_today': {
            'present': attendance_present,
            'absent': attendance_absent,
            'late': attendance_late,
            'rate': attendance_rate,
            'classes_submitted': classes_submitted_attendance,
        },

        # Finance
        'finance': {
            'outstanding_fees_count': outstanding_fees_count,
            'collected_today': float(total_collected_today),
            'fee_defaulters': fee_defaulters_list,
        },

        # Academic
        'current_term': current_term_data,
        'students_by_class': students_by_class_dict,
        'classes_overview': classes_overview,

        # Activity
        'activity_feed': activity_feed,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def parent_complete_profile(request):
    """
    POST /api/auth/parent/complete-profile/
    Allows a parent user to complete their mandatory profile.
    Expects multipart/form-data with: phone, address, relationship_to_student,
    passport_photo (image), id_document (file).
    """
    user = request.user
    if user.role != 'parent':
        return Response({'error': 'Only parents can use this endpoint.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        profile = user.parent_profile
    except ParentProfile.DoesNotExist:
        return Response({'error': 'Parent profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    if profile.completed_profile:
        return Response({'message': 'Profile already completed.'}, status=status.HTTP_200_OK)

    # Required fields
    phone = request.data.get('phone', '').strip()
    address = request.data.get('address', '').strip()
    relationship = request.data.get('relationship_to_student', '').strip()
    passport_photo = request.FILES.get('passport_photo')
    id_document = request.FILES.get('id_document')

    errors = {}
    if not phone:
        errors['phone'] = 'Phone number is required.'
    if not address:
        errors['address'] = 'Residential address is required.'
    if not relationship:
        errors['relationship_to_student'] = 'Relationship to pupil is required.'
    if not passport_photo:
        errors['passport_photo'] = 'Passport photo is required.'
    if not id_document:
        errors['id_document'] = 'ID document is required.'

    # File type validation
    ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
    ALLOWED_DOC_TYPES = ALLOWED_IMAGE_TYPES + ['application/pdf']
    MAX_FILE_SIZE = 3 * 1024 * 1024  # 3 MB

    if passport_photo:
        if passport_photo.content_type not in ALLOWED_IMAGE_TYPES:
            errors['passport_photo'] = 'Passport photo must be JPG, PNG, or WEBP.'
        elif passport_photo.size > MAX_FILE_SIZE:
            errors['passport_photo'] = 'Passport photo must be less than 3 MB.'

    if id_document:
        if id_document.content_type not in ALLOWED_DOC_TYPES:
            errors['id_document'] = 'ID document must be JPG, PNG, WEBP, or PDF.'
        elif id_document.size > MAX_FILE_SIZE:
            errors['id_document'] = 'ID document must be less than 3 MB.'

    if errors:
        return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

    # Save everything atomically
    with transaction.atomic():
        user.phone = phone
        user.address = address
        user.save(update_fields=['phone', 'address'])

        profile.relationship_to_student = relationship
        profile.passport_photo = passport_photo
        profile.id_document = id_document
        profile.completed_profile = True
        profile.save(update_fields=['relationship_to_student', 'passport_photo', 'id_document', 'completed_profile'])

    return Response({
        'message': 'Profile completed successfully.',
        'completed_profile': True
    }, status=status.HTTP_200_OK)

from django.contrib.auth.hashers import make_password
from rest_framework.decorators import action

class EnrollmentRequestViewSet(viewsets.ModelViewSet):
    queryset = EnrollmentRequest.objects.all()
    serializer_class = EnrollmentRequestSerializer
    
    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]

    def perform_create(self, serializer):
        # Hash the password before saving
        password = self.request.data.get('password')
        hashed_password = make_password(password)
        serializer.save(password=hashed_password)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        enrollment = self.get_object()
        if enrollment.status != 'pending':
            return Response({'error': 'Can only approve pending requests.'}, status=400)

        try:
            with transaction.atomic():
                # 1. Create Parent User
                parent_user = User(
                    email=enrollment.parent_email,
                    username=enrollment.parent_email.split('@')[0],
                    first_name=enrollment.parent_first_name,
                    last_name=enrollment.parent_last_name,
                    phone=enrollment.parent_phone,
                    address=enrollment.parent_address,
                    role='parent'
                )
                parent_user.password = enrollment.password
                parent_user.save()

                # 2. Create Parent Profile
                ParentProfile.objects.create(
                    user=parent_user,
                    relationship_to_student=enrollment.relationship_to_student,
                    occupation=enrollment.employment_details
                )

                # 3. Create Students
                from academics.models import SchoolClass
                import uuid
                created_students = []
                for student_data in enrollment.students_data:
                    admission_number = f"ADM{timezone.now().year}{uuid.uuid4().hex[:6].upper()}"

                    # Use provided email and username or fallback to generated ones
                    s_email = student_data.get('email') or f"{admission_number.lower()}@school.local"
                    s_username = student_data.get('username') or admission_number.lower()

                    import datetime
                    dob_val = student_data.get('dob')
                    if isinstance(dob_val, str) and dob_val:
                        try:
                            dob_val = datetime.datetime.strptime(dob_val, '%Y-%m-%d').date()
                        except ValueError:
                            dob_val = None

                    student_user = User.objects.create_user(
                        email=s_email,
                        username=s_username,
                        password=None,
                        first_name=student_data.get('first_name'),
                        middle_name=student_data.get('middle_name', ''),
                        last_name=student_data.get('last_name'),
                        date_of_birth=dob_val,
                        address=enrollment.parent_address, # Shared address
                        role='student'
                    )
                    student_user.set_unusable_password()
                    student_user.save(update_fields=['password'])

                    # Find class if specified
                    school_class = None
                    class_name = student_data.get('class')
                    if class_name:
                        school_class = SchoolClass.objects.filter(name__icontains=class_name).first()

                    StudentProfile.objects.create(
                        user=student_user,
                        admission_number=admission_number,
                        parent=parent_user,
                        gender=student_data.get('gender', 'M'),
                        state_of_origin=student_data.get('state_of_origin', ''),
                        place_of_birth=student_data.get('place_of_birth', ''),
                        blood_group=student_data.get('blood_group', ''),
                        emergency_contact_name=student_data.get('emergency_contact_name', ''),
                        emergency_contact_phone=student_data.get('emergency_contact_phone', ''),
                        emergency_contact_relationship=student_data.get('emergency_contact_relationship', ''),
                        medical_conditions=student_data.get('medical_conditions', ''),
                        current_class=school_class
                    )
                    created_students.append({
                        'admission_number': admission_number,
                        'student_name': f"{student_data.get('first_name')} {student_data.get('last_name')}"
                    })

                enrollment.status = 'approved'
                enrollment.parent_user = parent_user
                enrollment.approval_date = timezone.now()
                enrollment.save()

                # Print admission numbers to terminal for local development
                print("\n" + "="*70)
                print(f"ENROLLMENT APPROVED")
                print(f"Parent Email: {parent_user.email}")
                print(f"Parent Name: {parent_user.full_name}")
                print(f"Approval Date: {enrollment.approval_date.strftime('%Y-%m-%d %H:%M:%S')}")
                print("-"*70)
                for idx, student in enumerate(created_students, 1):
                    print(f"Student {idx}: {student['student_name']}")
                    print(f"  Admission Number: {student['admission_number']}")
                print("="*70 + "\n")

                return Response({
                    'message': 'Enrollment approved.',
                    'parent_email': parent_user.email,
                    'students': created_students
                })
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['post'])
    def deny(self, request, pk=None):
        enrollment = self.get_object()
        if enrollment.status != 'pending':
            return Response({'error': 'Can only deny pending requests.'}, status=400)

        enrollment.status = 'denied'
        enrollment.save()
        return Response({'message': 'Enrollment denied.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def parent_enrollment_status(request):
    """
    GET /api/auth/parent-enrollment-status/
    Check enrollment status for authenticated parent user
    Returns: { status: 'approved'|'pending'|'denied'|'none', linked_students_count: int }
    """
    user = request.user

    # Only parents can use this endpoint
    if user.role != 'parent':
        return Response(
            {'error': 'This endpoint is for parents only.'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Check for enrollment request matching this email
    enrollment = EnrollmentRequest.objects.filter(parent_email=user.email).latest('created_at') if EnrollmentRequest.objects.filter(parent_email=user.email).exists() else None

    enrollment_status = 'none'
    if enrollment:
        enrollment_status = enrollment.status

    # Count linked students
    linked_students_count = user.children.count()

    # Check if profile is completed
    completed_profile = False
    try:
        completed_profile = user.parent_profile.completed_profile
    except ParentProfile.DoesNotExist:
        pass

    return Response({
        'status': enrollment_status,
        'linked_students_count': linked_students_count,
        'has_enrollment_request': enrollment is not None,
        'enrollment_created_at': enrollment.created_at.isoformat() if enrollment else None,
        'completed_profile': completed_profile,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_by_admission_number(request):
    """
    GET /api/auth/student-by-admission/?admission_number=ADM2026XXXXX
    Get student details by admission number for confirmation display
    """
    admission_number = request.query_params.get('admission_number', '').strip()

    if not admission_number:
        return Response(
            {'error': 'admission_number query parameter is required.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        student_profile = StudentProfile.objects.select_related('user', 'current_class').get(
            admission_number__iexact=admission_number
        )

        return Response({
            'id': str(student_profile.id),
            'full_name': student_profile.user.full_name,
            'admission_number': student_profile.admission_number,
            'class_name': student_profile.current_class.name if student_profile.current_class else 'Not Assigned',
            'gender': student_profile.gender,
            'status': student_profile.status
        }, status=status.HTTP_200_OK)
    except StudentProfile.DoesNotExist:
        return Response(
            {'error': 'Student not found with this admission number.'},
            status=status.HTTP_404_NOT_FOUND
        )


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Notification.objects.select_related('sender', 'recipient')
        if user.role == 'admin':
            scope = self.request.query_params.get('scope')
            if scope == 'sent':
                return queryset.filter(sender=user)
        return queryset.filter(recipient=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return NotificationCreateSerializer
        return NotificationSerializer

    def create(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({'error': 'Only admins can send notifications.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        notifications = serializer.save()
        return Response({
            'message': f'Sent {len(notifications)} notification(s).',
            'count': len(notifications),
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=['is_read', 'read_at'])
        return Response({'message': 'Notification marked as read.'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        updated = self.get_queryset().filter(is_read=False).update(is_read=True, read_at=timezone.now())
        return Response({'message': f'Marked {updated} notification(s) as read.'})
