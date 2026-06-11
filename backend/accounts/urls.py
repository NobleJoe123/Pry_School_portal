from django.urls import path, include
from rest_framework.routers import DefaultRouter


from .views import (
    RegisterView,
    LoginView,
    TokenRefreshCookieView,
    LogoutView,
    UserProfileView,
    ChangePasswordView,
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
    parent_complete_profile
)


router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'teachers', TeacherViewSet, basename='teacher')
router.register(r'parents', ParentViewSet, basename='parent')
router.register(r'enrollment', EnrollmentRequestViewSet, basename='enrollment')
router.register(r'notifications', NotificationViewSet, basename='notification')

app_name = 'accounts'

urlpatterns = [
    path('health/', health_check, name='health'),

    #Authentication Endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshCookieView.as_view(), name='token_refresh'),

    #User Profile
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('health', health_check, name='health_check'),
    #Dashboard
    path('dashboard/stats/', dashboard_stats, name='dashboard_stats'),

    # Enrollment Status
    path('parent-enrollment-status/', parent_enrollment_status, name='parent_enrollment_status'),
    path('student-by-admission/', get_student_by_admission_number, name='student_by_admission'),
    path('parent/complete-profile/', parent_complete_profile, name='parent_complete_profile'),

    path('', include(router.urls)),
]
