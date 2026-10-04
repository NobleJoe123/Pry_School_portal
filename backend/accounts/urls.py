from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status as drf_status


from .views import (
    LoginView,
    TokenRefreshCookieView,
    LogoutView,
    UserProfileView,
    ChangePasswordView,
    CompleteFirstLoginView,
    ForgotPasswordView,
    ResetPasswordView,
    health_check,

    # Management Viewsets

    StudentViewSet,
    TeacherViewSet,
    ParentViewSet,

    # Dashboard Views
    dashboard_stats,

    EnrollmentRequestViewSet,
    NotificationViewSet,
    parent_enrollment_status,
    get_student_by_admission_number,
    parent_complete_profile,
    SupportTicketViewSet
)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def register_gone(request):
    """
    The open /auth/register/ endpoint has been removed.
    New parent accounts are created only through the admin-approved
    enrollment flow at /api/auth/enrollment/.
    """
    return Response(
        {
            'error': (
                'Direct self-registration is disabled. '
                'Please submit an enrollment request at /api/auth/enrollment/ '
                'and wait for admin approval.'
            )
        },
        status=drf_status.HTTP_410_GONE,
    )


router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'teachers', TeacherViewSet, basename='teacher')
router.register(r'parents', ParentViewSet, basename='parent')
router.register(r'enrollment', EnrollmentRequestViewSet, basename='enrollment')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'tickets', SupportTicketViewSet, basename='ticket')

app_name = 'accounts'

urlpatterns = [
    path('health/', health_check, name='health'),

    # Direct self-registration is disabled — 410 Gone
    path('register/', register_gone, name='register_gone'),

    #Authentication Endpoints
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshCookieView.as_view(), name='token_refresh'),

    #User Profile
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('complete-first-login/', CompleteFirstLoginView.as_view(), name='complete_first_login'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('health', health_check, name='health_check'),
    #Dashboard
    path('dashboard/stats/', dashboard_stats, name='dashboard_stats'),

    # Enrollment Status
    path('parent-enrollment-status/', parent_enrollment_status, name='parent_enrollment_status'),
    path('student-by-admission/', get_student_by_admission_number, name='student_by_admission'),
    path('parent/complete-profile/', parent_complete_profile, name='parent_complete_profile'),

    path('', include(router.urls)),
]
