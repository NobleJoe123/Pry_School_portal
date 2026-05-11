from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AcademicYearViewSet, TermViewSet, 
    ClassLevelViewSet, SchoolClassViewSet, SubjectViewSet,
    AssessmentTypeViewSet, AssessmentViewSet, StudentScoreViewSet
)

router = DefaultRouter()
router.register(r'years', AcademicYearViewSet)
router.register(r'terms', TermViewSet)
router.register(r'levels', ClassLevelViewSet)
router.register(r'classes', SchoolClassViewSet)
router.register(r'subjects', SubjectViewSet)
router.register(r'assessment-types', AssessmentTypeViewSet)
router.register(r'assessments', AssessmentViewSet)
router.register(r'scores', StudentScoreViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
