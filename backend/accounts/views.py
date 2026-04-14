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
from datetime import datetime, timedelta
from .models import User, StudentProfile, TeacherProfile, ParentProfile
from .serializers import (
    UserSerializer, RegisterSerializer, StudentProfileSerializer,
    TeacherProfileSerializer, ParentProfileSerializer, ChangePasswordSerializer,
    CreateStudentSerializer, StudentDetailSerializer, UpdateStudentSerializer,
    CreateTeacherSerializer, TeacherDetailSerializer, ParentDetailSerializer
)

from .permissions import IsAdminOrReadOnly

# Cookie Settings

REFRESH_COOKIE_NAME = 'refresh_token'

COOKIE_SETTINGS = {
    'key': REFRESH_COOKIE_NAME,
    'httponly': True,
    'secure' : False,
    'samesite': 'Lax',
    'path' : '/api/auth/',
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
        
        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'access_token': access,
            'message': 'Registration successful!'
        }, status=status.HTTP_201_CREATED)
        
        response.set_cookie(value=str(refresh), **COOKIE_SETTINGS)
        return response


class LoginView(APIView):
    """
    POST /api/auth/login/
    Login with email and password
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').lower()
        password = request.data.get('password')
        
        if not email or not password:
            return Response(
                {'error': 'Please provide both email and password.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Authenticate user
        user = User.objects.filter(email=email).first()
        
        if user is None:
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        if not user.check_password(password):
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
        user.save(update_fields=['last_login'])
        
        
        
        response = Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'access_token': access,
            'message': 'Login successful!'
        }, status=status.HTTP_200_OK)


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
        
        response.delete_cookie(REFRESH_COOKIE_NAME, path='/api/auth/', samesite='Lax')
        return response
    

class TokenRefreshView(APIView):
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
            response.set_cookie(value=str(refresh), **COOKIE_SETTINGS)
            return response
        
        except TokenError:
            response = Response(
                {'error': 'Refresh token is invalid or expired. Please log in again'},
                status=status.HTTP_401_UNAUTHORIZED
            )
            response.delete_cookie(REFRESH_COOKIE_NAME, path='/api/auth')
            return response



class UserProfileView(APIView):
    """
    GET /api/auth/me/
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
        user = request.user
        serializer = UserSerializer(
            user,
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
        queryset = User.objects.filter(role='student').select_related('student_profile', 'student_profile__parent_profile')
        
        class_name = self.request.query_params.get('class', None)
        if class_name:
            queryset = queryset.filter(student_profile__class=class_name)
        
        student_status = self.request.query_params.get('status', None)
        if student_status:
            queryset = queryset.filter(student_profile__status=student_status)
            
        parent_id = self.request.query_params.get('parent_id', None)
        if parent_id:
            queryset = queryset.filter(student_profile__parent_id=parent_id)
            
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateStudentSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateStudentSerializer
        elif self.action == 'retrieve':
            return StudentDetailSerializer
        return UserSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'message': 'Student created successfully!',
            'student': UserSerializer(user, context={'request': request}).data
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
        total = queryset.count()
        active = queryset.filter(student_profile__status='active').count()
        by_class = queryset.values('student_profile__current_class').annotate(count=Count('id'))
            
        return Response({
            'total_students': total,
            'active_students': active,
            'by_class': list(by_class)
            
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
        
        # Filter by employment status
        employment_status = self.request.query_params.get('employment_status', None)
        if employment_status:
            queryset = queryset.filter(teacher_profile__employment_status=employment_status)
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateTeacherSerializer
        elif self.action == 'retrieve':
            return TeacherDetailSerializer
        return UserSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'message': 'Teacher created successfully!',
            'teacher': UserSerializer(user, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)
    
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

class ParentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing parents
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['first_name', 'last_name', 'email', 'phone']
    ordering = ['-date_joined']
    
    def get_queryset(self):
        return User.objects.filter(role='parent').select_related('parent_profile').prefetch_related('children')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ParentDetailSerializer
        return UserSerializer


# DASHBOARD VIEWS

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def dashboard_stats(request):
    """
    GET /api/dashboard/stats/
    Get overview statistics for admin dashboard
    """
    total_students = User.objects.filter(role='student').count()
    active_students = StudentProfile.objects.filter(status='active').count()
    total_teachers = User.objects.filter(role='teacher').count()
    total_parents = User.objects.filter(role='parent').count()
    
    # Students by class
    students_by_class = StudentProfile.objects.exclude(current_class__isnull=True).exclude(current_class='').values('current_class').annotate(
        count=Count('id')
    ).order_by('-count')
    
    students_by_class_dict = {
        item['current_class']: item['count'] for item in students_by_class
    }
    
    # Recent registrations (last 7 days)
    week_ago = datetime.now() - timedelta(days=7)
    recent_students = User.objects.filter(
        role='student',
        date_joined__gte=week_ago
    ).count()
    
    return Response({
        'total_students': total_students,
        'active_students': active_students,
        'total_teachers': total_teachers,
        'total_parents': total_parents,
        'students_by_class': students_by_class_dict,
        'recent_registrations': recent_students
    })
            