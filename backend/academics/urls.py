from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AcademicYearViewSet, TermViewSet,
    ClassLevelViewSet, SchoolClassViewSet, SubjectViewSet,
    AssessmentTypeViewSet, AssessmentViewSet, StudentScoreViewSet,
    ReportCardViewSet, SchoolEventViewSet, LessonMaterialViewSet,
    BehaviorNoteViewSet,
    grading_scale_view
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
router.register(r'report-cards', ReportCardViewSet)
router.register(r'events', SchoolEventViewSet)
router.register(r'materials', LessonMaterialViewSet)
router.register(r'behavior-notes', BehaviorNoteViewSet, basename='behavior-notes')

urlpatterns = [
    path('grading-scale/', grading_scale_view, name='grading_scale'),
    path('', include(router.urls)),
]

