from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeeTypeViewSet, StudentFeeViewSet, PaymentRecordViewSet, PayrollViewSet

router = DefaultRouter()
router.register(r'fee-types', FeeTypeViewSet)
router.register(r'student-fees', StudentFeeViewSet)
router.register(r'payments', PaymentRecordViewSet)
router.register(r'payroll', PayrollViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
