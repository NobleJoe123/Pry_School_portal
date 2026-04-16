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
    dashboard_stats
)


router = DefaultRouter()
router.register(r'students', StudentViewSet, basename='student')
router.register(r'teachers', TeacherViewSet, basename='teacher')
router.register(r'parents', ParentViewSet, basename='parent')

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
    
    
    path('', include(router.urls)),
]