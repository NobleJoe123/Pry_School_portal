from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudentAttendanceViewSet, TeacherAttendanceViewSet

router = DefaultRouter()
router.register(r'students', StudentAttendanceViewSet)
router.register(r'teachers', TeacherAttendanceViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
