from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum, Q
from django.utils import timezone
from .models import FeeType, StudentFee, PaymentRecord, Payroll
from .serializers import FeeTypeSerializer, StudentFeeSerializer, PaymentRecordSerializer, PayrollSerializer


class FeeTypeViewSet(viewsets.ModelViewSet):
    queryset = FeeType.objects.all()
    serializer_class = FeeTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        level_id = self.request.query_params.get('level')
        if level_id:
            queryset = queryset.filter(level_id=level_id)
        return queryset


class StudentFeeViewSet(viewsets.ModelViewSet):
    queryset = StudentFee.objects.select_related('student', 'fee_type', 'term').all()
    serializer_class = StudentFeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if user.role == 'student':
            queryset = queryset.filter(student=user)
        elif user.role == 'parent':
            queryset = queryset.filter(student__student_profile__parent=user)

        # Filters
        term_id = self.request.query_params.get('term')
        if term_id:
            queryset = queryset.filter(term_id=term_id)

        fee_status = self.request.query_params.get('status')
        if fee_status:
            queryset = queryset.filter(status=fee_status)

        student_id = self.request.query_params.get('student')
        if student_id:
            queryset = queryset.filter(student_id=student_id)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(student__first_name__icontains=search) |
                Q(student__last_name__icontains=search) |
                Q(fee_type__name__icontains=search)
            )

        return queryset

    @action(detail=False, methods=['get'])
    def summary(self, request):
        queryset = self.get_queryset()
        total_outstanding = queryset.filter(
            status__in=['outstanding', 'partial']
        ).aggregate(
            total=Sum('fee_type__amount')
        )['total'] or 0

        total_partial_paid = queryset.filter(
            status='partial'
        ).aggregate(total=Sum('amount_paid'))['total'] or 0

        total_paid = queryset.filter(
            status='paid'
        ).aggregate(total=Sum('amount_paid'))['total'] or 0

        actual_paid = float(total_paid) + float(total_partial_paid)
        outstanding_amount = float(total_outstanding) - float(total_partial_paid)

        grand_total = actual_paid + outstanding_amount
        collection_rate = (actual_paid / grand_total * 100) if grand_total > 0 else 0

        return Response({
            'total_outstanding': round(outstanding_amount, 2),
            'total_paid': round(actual_paid, 2),
            'collection_rate': round(collection_rate, 1),
        })

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """Record a payment for a specific StudentFee."""
        student_fee = self.get_object()
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method', 'cash')
        transaction_id = request.data.get('transaction_id', '')

        if not amount:
            return Response({'error': 'amount is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = float(amount)
        except (TypeError, ValueError):
            return Response({'error': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({'error': 'Amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)

        remaining_balance = float(student_fee.fee_type.amount) - float(student_fee.amount_paid)
        if amount > remaining_balance:
            return Response({
                'error': f'Amount ₦{amount:,.2f} exceeds remaining balance of ₦{remaining_balance:,.2f}.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create payment record
        payment = PaymentRecord.objects.create(
            student_fee=student_fee,
            amount=amount,
            payment_method=payment_method,
            transaction_id=transaction_id or None,
            received_by=request.user,
        )

        # Update StudentFee
        from decimal import Decimal
        student_fee.amount_paid += Decimal(str(amount))
        if student_fee.amount_paid >= student_fee.fee_type.amount:
            student_fee.status = 'paid'
        elif student_fee.amount_paid > 0:
            student_fee.status = 'partial'
        student_fee.save()

        # Send payment notifications
        try:
            from accounts.models import Notification
            student = student_fee.student
            fee_name = student_fee.fee_type.name
            parent = student.student_profile.parent if hasattr(student, 'student_profile') else None
            
            msg = f"A payment of ₦{amount:,.2f} has been received for {student.full_name}'s {fee_name}. New status: {student_fee.get_status_display()}."
            if transaction_id:
                msg += f" Transaction ID: {transaction_id}."
                
            if parent:
                Notification.objects.create(
                    sender=request.user,
                    recipient=parent,
                    title="Payment Received",
                    message=msg,
                    category='finance',
                    audience='selected'
                )
            
            Notification.objects.create(
                sender=request.user,
                recipient=student,
                title="Fee Payment Recorded",
                message=f"A payment of ₦{amount:,.2f} was recorded for your {fee_name}.",
                category='finance',
                audience='selected'
            )
        except Exception as e:
            print(f"Error sending payment notification: {e}")

        serializer = self.get_serializer(student_fee)
        return Response({
            'message': f'Payment of ₦{amount:,.2f} recorded successfully.',
            'payment_id': str(payment.id),
            'student_fee': serializer.data,
        })

    @action(detail=False, methods=['post'])
    def bulk_assign(self, request):
        """Bulk assign fee types to all students in a class or term."""
        fee_type_id = request.data.get('fee_type')
        term_id = request.data.get('term')
        student_ids = request.data.get('student_ids', [])

        if not fee_type_id or not term_id:
            return Response({'error': 'fee_type and term are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            fee_type = FeeType.objects.get(id=fee_type_id)
        except FeeType.DoesNotExist:
            return Response({'error': 'Fee type not found.'}, status=status.HTTP_404_NOT_FOUND)

        from accounts.models import User
        if student_ids:
            students = User.objects.filter(id__in=student_ids, role='student')
        else:
            # Assign to all students in the fee type's class level
            students = User.objects.filter(
                role='student',
                student_profile__current_class__level=fee_type.level
            )

        created_count = 0
        notifications = []
        try:
            from accounts.models import Notification
        except ImportError:
            Notification = None

        for student in students:
            sf, created = StudentFee.objects.get_or_create(
                student=student,
                fee_type=fee_type,
                term_id=term_id,
                defaults={'status': 'outstanding', 'amount_paid': 0}
            )
            if created:
                created_count += 1
                if Notification:
                    msg = f"A new fee of ₦{fee_type.amount:,.2f} for {fee_type.name} has been assigned for this term."
                    notifications.append(
                        Notification(
                            sender=request.user,
                            recipient=student,
                            title=f"New Fee: {fee_type.name}",
                            message=msg,
                            category='finance',
                            audience='selected'
                        )
                    )
                    parent = student.student_profile.parent if hasattr(student, 'student_profile') else None
                    if parent:
                        parent_msg = f"A new fee of ₦{fee_type.amount:,.2f} for {fee_type.name} has been assigned to your child, {student.full_name}."
                        notifications.append(
                            Notification(
                                sender=request.user,
                                recipient=parent,
                                title=f"Tuition Invoice: {student.first_name}",
                                message=parent_msg,
                                category='finance',
                                audience='selected'
                            )
                        )
        if notifications and Notification:
            Notification.objects.bulk_create(notifications)

        return Response({
            'message': f'Fee assigned to {created_count} student(s). {students.count() - created_count} already had this fee.'
        })


class PaymentRecordViewSet(viewsets.ModelViewSet):
    queryset = PaymentRecord.objects.select_related(
        'student_fee__student', 'received_by'
    ).all()
    serializer_class = PaymentRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        student_id = self.request.query_params.get('student')
        if student_id:
            queryset = queryset.filter(student_fee__student_id=student_id)

        payment_method = self.request.query_params.get('payment_method')
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)

        return queryset.order_by('-date')

    def perform_create(self, serializer):
        payment = serializer.save(received_by=self.request.user)
        # Update StudentFee status and amount_paid
        fee = payment.student_fee
        from decimal import Decimal
        fee.amount_paid += Decimal(str(payment.amount))
        if fee.amount_paid >= fee.fee_type.amount:
            fee.status = 'paid'
        elif fee.amount_paid > 0:
            fee.status = 'partial'
        fee.save()

        # Send payment notifications
        try:
            from accounts.models import Notification
            student = fee.student
            fee_name = fee.fee_type.name
            parent = student.student_profile.parent if hasattr(student, 'student_profile') else None
            
            msg = f"A payment of ₦{payment.amount:,.2f} has been received for {student.full_name}'s {fee_name}. New status: {fee.get_status_display()}."
            if payment.transaction_id:
                msg += f" Transaction ID: {payment.transaction_id}."
                
            if parent:
                Notification.objects.create(
                    sender=self.request.user,
                    recipient=parent,
                    title="Payment Received",
                    message=msg,
                    category='finance',
                    audience='selected'
                )
            Notification.objects.create(
                sender=self.request.user,
                recipient=student,
                title="Fee Payment Recorded",
                message=f"A payment of ₦{payment.amount:,.2f} was recorded for your {fee_name}.",
                category='finance',
                audience='selected'
            )
        except Exception as e:
            print(f"Error sending payment notification: {e}")


class PayrollViewSet(viewsets.ModelViewSet):
    queryset = Payroll.objects.select_related('teacher').all()
    serializer_class = PayrollSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        pay_status = self.request.query_params.get('status')

        if year:
            queryset = queryset.filter(year=year)
        if month:
            queryset = queryset.filter(month=month)
        if pay_status:
            queryset = queryset.filter(status=pay_status)

        return queryset.order_by('-year', '-month')

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        payroll = self.get_object()
        if payroll.status == 'paid':
            return Response({'error': 'Payroll is already marked as paid.'}, status=status.HTTP_400_BAD_REQUEST)
        payroll.status = 'paid'
        payroll.payment_date = timezone.now().date()
        payroll.save()
        return Response({'message': 'Payroll marked as paid.', 'payment_date': str(payroll.payment_date)})

    @action(detail=False, methods=['post'])
    def generate_monthly(self, request):
        """Auto-generate payroll for all teachers for a given month/year."""
        month = request.data.get('month', timezone.now().month)
        year = request.data.get('year', timezone.now().year)

        from accounts.models import User
        teachers = User.objects.filter(role='teacher', is_active=True)

        created_count = 0
        skipped_count = 0
        for teacher in teachers:
            salary = 0
            if hasattr(teacher, 'teacher_profile') and teacher.teacher_profile.monthly_salary:
                salary = float(teacher.teacher_profile.monthly_salary)

            _, created = Payroll.objects.get_or_create(
                teacher=teacher,
                month=month,
                year=year,
                defaults={
                    'basic_salary': salary or 50000,
                    'bonuses': 0,
                    'deductions': 0,
                    'status': 'draft'
                }
            )
            if created:
                created_count += 1
            else:
                skipped_count += 1

        return Response({
            'message': f'Generated payroll for {created_count} teacher(s). {skipped_count} already existed.'
        })
