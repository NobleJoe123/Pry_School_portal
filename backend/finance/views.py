from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum
from .models import FeeType, StudentFee, PaymentRecord, Payroll
from .serializers import FeeTypeSerializer, StudentFeeSerializer, PaymentRecordSerializer, PayrollSerializer

class FeeTypeViewSet(viewsets.ModelViewSet):
    queryset = FeeType.objects.all()
    serializer_class = FeeTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

class StudentFeeViewSet(viewsets.ModelViewSet):
    queryset = StudentFee.objects.all()
    serializer_class = StudentFeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return StudentFee.objects.filter(student=user)
        elif user.role == 'parent':
            return StudentFee.objects.filter(student__student_profile__parent=user)
        return StudentFee.objects.all()

    @action(detail=False, methods=['get'])
    def summary(self, request):
        queryset = self.get_queryset()
        total_outstanding = queryset.filter(status='outstanding').aggregate(Sum('fee_type__amount'))['fee_type__amount__sum'] or 0
        total_paid = queryset.aggregate(Sum('amount_paid'))['amount_paid__sum'] or 0
        
        return Response({
            'total_outstanding': total_outstanding,
            'total_paid': total_paid,
            'collection_rate': (total_paid / (total_paid + total_outstanding) * 100) if (total_paid + total_outstanding) > 0 else 0
        })

class PaymentRecordViewSet(viewsets.ModelViewSet):
    queryset = PaymentRecord.objects.all()
    serializer_class = PaymentRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        payment = serializer.save(received_by=self.request.user)
        # Update StudentFee status and amount_paid
        fee = payment.student_fee
        fee.amount_paid += payment.amount
        if fee.amount_paid >= fee.fee_type.amount:
            fee.status = 'paid'
        elif fee.amount_paid > 0:
            fee.status = 'partial'
        fee.save()

class PayrollViewSet(viewsets.ModelViewSet):
    queryset = Payroll.objects.all()
    serializer_class = PayrollSerializer
    permission_classes = [permissions.IsAuthenticated]
