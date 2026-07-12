from decimal import Decimal
import requests
from django.conf import settings
from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db.models import Sum, Q, Count
from django.utils import timezone
from .models import FeeType, StudentFee, PaymentRecord, Payroll, PayrollAuditLog
from .serializers import (
    FeeTypeSerializer, StudentFeeSerializer, PaymentRecordSerializer,
    PayrollSerializer, PayrollDetailSerializer, PayrollAuditLogSerializer,
)


PAYROLL_MANAGER_ROLES = {'admin', 'finance_officer'}
PAYROLL_READONLY_ROLES = {'school_proprietor'}


def can_manage_payroll(user):
    return getattr(user, 'role', None) in PAYROLL_MANAGER_ROLES or getattr(user, 'is_superuser', False)


def can_view_payroll_analytics(user):
    return can_manage_payroll(user) or getattr(user, 'role', None) in PAYROLL_READONLY_ROLES


def log_payroll_action(payroll, user, action, previous_value=None, updated_value=None):
    PayrollAuditLog.objects.create(
        payroll=payroll,
        user=user if getattr(user, 'is_authenticated', False) else None,
        action=action,
        previous_value=previous_value,
        updated_value=updated_value,
    )


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

    @action(detail=True, methods=['post'])
    def initialize_paystack(self, request, pk=None):
        """Initialize Paystack payment for a specific StudentFee."""
        student_fee = self.get_object()
        if student_fee.status == 'paid':
            return Response({'error': 'Fee is already fully paid.'}, status=status.HTTP_400_BAD_REQUEST)

        amount = request.data.get('amount')
        if not amount:
            amount = student_fee.balance
        else:
            try:
                amount = Decimal(str(amount))
            except Exception:
                return Response({'error': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)

            if amount <= 0:
                return Response({'error': 'Amount must be greater than zero.'}, status=status.HTTP_400_BAD_REQUEST)
            if amount > student_fee.balance:
                return Response({'error': f'Amount exceeds outstanding balance of {student_fee.balance}.'}, status=status.HTTP_400_BAD_REQUEST)

        email = getattr(request.user, 'email', None) or getattr(student_fee.student, 'email', None) or 'billing@anyiprimaryschool.ng'

        # If PAYSTACK_SECRET_KEY is empty, fall back to mock sandbox payment
        paystack_key = getattr(settings, 'PAYSTACK_SECRET_KEY', '')
        if not paystack_key:
            ref = f"MOCK-{student_fee.id}-{int(timezone.now().timestamp())}"
            mock_url = f"/parent/fees?mock_status=success&reference={ref}&amount={amount}&fee_id={student_fee.id}"
            return Response({
                'authorization_url': mock_url,
                'reference': ref,
                'mock': True
            })

        # Real Paystack initialization
        ref = f"PSTK-{student_fee.id}-{int(timezone.now().timestamp())}"
        headers = {
            'Authorization': f'Bearer {paystack_key}',
            'Content-Type': 'application/json',
        }
        
        callback_url = request.data.get('callback_url') or request.build_absolute_uri('/parent/fees')
        if '?' in callback_url:
            callback_url += f"&reference={ref}"
        else:
            callback_url += f"?reference={ref}"

        payload = {
            'email': email,
            'amount': int(float(amount) * 100),  # converted to kobo
            'reference': ref,
            'callback_url': callback_url,
            'metadata': {
                'student_fee_id': str(student_fee.id),
                'amount': float(amount),
            }
        }

        try:
            r = requests.post('https://api.paystack.co/transaction/initialize', json=payload, headers=headers, timeout=15)
            r_data = r.json()
            if r.status_code == 200 and r_data.get('status') is True:
                return Response(r_data.get('data'))
            else:
                return Response({'error': r_data.get('message', 'Failed to initialize Paystack transaction.')}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'Paystack API connection error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def verify_paystack(self, request):
        """Verify transaction with Paystack and credit student fee."""
        reference = request.data.get('reference')
        fee_id = request.data.get('student_fee_id')

        if not reference:
            return Response({'error': 'Transaction reference is required.'}, status=status.HTTP_400_BAD_REQUEST)

        existing_payment = PaymentRecord.objects.filter(transaction_id=reference).first()
        if existing_payment:
            return Response({
                'message': 'Payment already verified.',
                'student_fee': StudentFeeSerializer(existing_payment.student_fee).data
            })

        amount = None
        student_fee = None
        paystack_key = getattr(settings, 'PAYSTACK_SECRET_KEY', '')

        # Mock reference support
        if reference.startswith('MOCK-'):
            if paystack_key:
                return Response({'error': 'Mock references are not accepted in production mode.'}, status=status.HTTP_400_BAD_REQUEST)
            
            if not fee_id:
                parts = reference.split('-')
                if len(parts) >= 2:
                    fee_id = parts[1]
            
            if not fee_id:
                return Response({'error': 'student_fee_id is required for mock verification.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                student_fee = StudentFee.objects.get(id=fee_id)
            except StudentFee.DoesNotExist:
                return Response({'error': 'Student fee not found.'}, status=status.HTTP_404_NOT_FOUND)

            amount = request.data.get('amount')
            if not amount:
                amount = student_fee.balance
            else:
                amount = Decimal(str(amount))
        else:
            if not paystack_key:
                return Response({'error': 'Paystack keys are not configured. Cannot verify real transactions.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            headers = {
                'Authorization': f'Bearer {paystack_key}',
            }
            try:
                r = requests.get(f'https://api.paystack.co/transaction/verify/{reference}', headers=headers, timeout=15)
                r_data = r.json()
                if r.status_code == 200 and r_data.get('status') is True:
                    data = r_data.get('data')
                    if data.get('status') != 'success':
                        return Response({'error': f"Transaction verification failed: status is {data.get('status')}"}, status=status.HTTP_400_BAD_REQUEST)
                    
                    amount = Decimal(data.get('amount')) / 100
                    fee_id = data.get('metadata', {}).get('student_fee_id') or fee_id
                    if not fee_id:
                        return Response({'error': 'Student fee information missing in transaction metadata.'}, status=status.HTTP_400_BAD_REQUEST)
                    
                    try:
                        student_fee = StudentFee.objects.get(id=fee_id)
                    except StudentFee.DoesNotExist:
                        return Response({'error': 'Student fee not found.'}, status=status.HTTP_404_NOT_FOUND)
                else:
                    return Response({'error': r_data.get('message', 'Failed to verify transaction with Paystack.')}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({'error': f'Paystack API connection error: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        payment = PaymentRecord.objects.create(
            student_fee=student_fee,
            amount=amount,
            payment_method='online',
            transaction_id=reference,
            received_by=None,
        )

        student_fee.amount_paid += Decimal(str(amount))
        if student_fee.amount_paid >= student_fee.fee_type.amount:
            student_fee.status = 'paid'
        elif student_fee.amount_paid > 0:
            student_fee.status = 'partial'
        student_fee.save()

        try:
            from accounts.models import Notification
            student = student_fee.student
            fee_name = student_fee.fee_type.name
            parent = student.student_profile.parent if hasattr(student, 'student_profile') else None
            
            msg = f"A payment of ₦{amount:,.2f} has been verified for {student.full_name}'s {fee_name} via online gateway. New status: {student_fee.get_status_display()}."
            if parent:
                Notification.objects.create(
                    sender=None,
                    recipient=parent,
                    title="Online Payment Verified",
                    message=msg,
                    category='finance',
                    audience='selected'
                )
            
            Notification.objects.create(
                sender=None,
                recipient=student,
                title="Fee Payment Recorded",
                message=f"Online payment of ₦{amount:,.2f} was successfully recorded for your {fee_name}.",
                category='finance',
                audience='selected'
            )
        except Exception as e:
            print(f"Error sending online payment notification: {e}")

        return Response({
            'message': 'Payment verified successfully.',
            'payment_id': str(payment.id),
            'student_fee': StudentFeeSerializer(student_fee).data
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
        user = self.request.user
        queryset = super().get_queryset()
        if getattr(user, 'role', None) == 'teacher':
            queryset = queryset.filter(teacher=user)
        elif not can_view_payroll_analytics(user):
            return queryset.none()

        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        pay_status = self.request.query_params.get('status')
        role = self.request.query_params.get('role')
        department = self.request.query_params.get('department')
        employment_status = self.request.query_params.get('employment_status')
        search = self.request.query_params.get('search')

        if year:
            queryset = queryset.filter(year=year)
        if month:
            queryset = queryset.filter(month=month)
        if pay_status:
            queryset = queryset.filter(status=pay_status)
        if role:
            queryset = queryset.filter(teacher__role=role)
        if department:
            queryset = queryset.filter(department__iexact=department)
        if employment_status:
            queryset = queryset.filter(teacher__teacher_profile__employment_status=employment_status)
        if search:
            queryset = queryset.filter(
                Q(teacher__first_name__icontains=search) |
                Q(teacher__last_name__icontains=search) |
                Q(teacher__username__icontains=search) |
                Q(teacher__teacher_profile__staff_id__icontains=search)
            )

        return queryset.order_by('-year', '-month')

    def perform_create(self, serializer):
        if not can_manage_payroll(self.request.user):
            raise permissions.PermissionDenied('You do not have permission to create payroll records.')
        payroll = serializer.save()
        log_payroll_action(payroll, self.request.user, 'payroll_created', updated_value=self.get_serializer(payroll).data)

    def perform_update(self, serializer):
        if not can_manage_payroll(self.request.user):
            raise permissions.PermissionDenied('You do not have permission to update payroll records.')
        previous = self.get_serializer(self.get_object()).data
        payroll = serializer.save()
        log_payroll_action(payroll, self.request.user, 'payroll_updated', previous, self.get_serializer(payroll).data)

    def destroy(self, request, *args, **kwargs):
        if not can_manage_payroll(request.user):
            return Response({'error': 'You do not have permission to delete payroll records.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    # ── Summary ───────────────────────────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def summary(self, request):
        if not can_view_payroll_analytics(request.user):
            return Response({'error': 'You do not have permission to view payroll analytics.'}, status=status.HTTP_403_FORBIDDEN)

        queryset = self.get_queryset()
        now = timezone.now()
        month = int(request.query_params.get('month', now.month))
        year = int(request.query_params.get('year', now.year))
        period = queryset.filter(month=month, year=year)

        total_payroll = sum((p.net_salary for p in period), Decimal('0.00'))
        total_deductions = sum((p.total_deductions for p in period), Decimal('0.00'))
        total_allowances = sum((p.total_allowances for p in period), Decimal('0.00'))
        total_bonuses = sum((p.total_bonuses for p in period), Decimal('0.00'))
        total_basic = sum((p.basic_salary for p in period), Decimal('0.00'))
        staff_paid = period.filter(status='paid').count()
        pending = period.exclude(status__in=['paid', 'reversed', 'cancelled']).count()
        total_staff = period.count()
        completion = round((staff_paid / total_staff * 100), 1) if total_staff else 0
        due_date = period.exclude(due_date__isnull=True).order_by('due_date').values_list('due_date', flat=True).first()
        locked_count = period.filter(status='locked').count()
        approved_count = period.filter(status__in=['approved', 'locked', 'processing', 'paid']).count()

        return Response({
            'month': month,
            'year': year,
            'total_monthly_payroll': total_payroll,
            'total_basic_salary': total_basic,
            'staff_paid': staff_paid,
            'total_staff': total_staff,
            'pending_salary_payments': pending,
            'payroll_completion': completion,
            'payroll_due_date': due_date,
            'total_deductions': total_deductions,
            'total_bonuses': total_bonuses,
            'total_allowances': total_allowances,
            'payroll_processing_status': (
                'locked' if locked_count and locked_count == total_staff
                else 'approved' if approved_count
                else 'draft'
            ),
        })

    # ── Staff Directory ───────────────────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def staff_directory(self, request):
        if not can_view_payroll_analytics(request.user):
            return Response({'error': 'You do not have permission to view payroll staff records.'}, status=status.HTTP_403_FORBIDDEN)

        from accounts.models import User
        users = User.objects.filter(role__in=['teacher', 'admin'], is_active=True).select_related('teacher_profile')
        role_filter = request.query_params.get('role')
        employment_type = request.query_params.get('employment_type')
        payroll_status = request.query_params.get('payroll_status')
        department = request.query_params.get('department')
        search = request.query_params.get('search')

        if role_filter:
            users = users.filter(role=role_filter)
        if employment_type:
            users = users.filter(teacher_profile__employment_status=employment_type)
        if search:
            users = users.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(username__icontains=search) |
                Q(teacher_profile__staff_id__icontains=search)
            )

        # Get the target period (from query params or latest available)
        target_month = request.query_params.get('month')
        target_year = request.query_params.get('year')
        if target_month and target_year:
            payroll_lookup = {
                str(p.teacher_id): p
                for p in Payroll.objects.filter(month=target_month, year=target_year)
            }
        else:
            latest_period = Payroll.objects.order_by('-year', '-month').values('year', 'month').first()
            payroll_lookup = {}
            if latest_period:
                records = Payroll.objects.filter(year=latest_period['year'], month=latest_period['month'])
                if payroll_status:
                    records = records.filter(status=payroll_status)
                if department:
                    records = records.filter(department__iexact=department)
                payroll_lookup = {str(p.teacher_id): p for p in records}
                if payroll_status or department:
                    users = users.filter(id__in=payroll_lookup.keys())

        staff = []
        for user in users:
            profile = getattr(user, 'teacher_profile', None)
            record = payroll_lookup.get(str(user.id))
            photo_url = user.profile_photo.url if user.profile_photo else None
            staff.append({
                'id': user.id,
                'staff_id': getattr(profile, 'staff_id', None) or user.username,
                'full_name': user.full_name,
                'role': user.role,
                'department': record.department if record else (
                    'Teaching' if user.role == 'teacher' else 'Administration'
                ),
                'employment_status': getattr(profile, 'employment_status', None) or 'full_time',
                'salary_grade': record.salary_grade if record else None,
                'payment_status': record.status if record else 'not_generated',
                'net_salary': float(record.net_salary) if record else None,
                'basic_salary': float(record.basic_salary) if record else None,
                'profile_photo_url': photo_url,
            })

        return Response(staff)

    # ── Per-Record Actions ────────────────────────────────────────────────────

    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """Transition payroll from draft to preview state."""
        if not can_manage_payroll(request.user):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        payroll = self.get_object()
        if payroll.status != 'draft':
            return Response({'error': 'Only draft payroll can be set to preview.'}, status=status.HTTP_400_BAD_REQUEST)
        previous = {'status': payroll.status}
        payroll.status = 'preview'
        payroll.save()
        log_payroll_action(payroll, request.user, 'payroll_previewed', previous, {'status': payroll.status})
        return Response(PayrollDetailSerializer(payroll).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if not can_manage_payroll(request.user):
            return Response({'error': 'You do not have permission to approve payroll.'}, status=status.HTTP_403_FORBIDDEN)
        payroll = self.get_object()
        if payroll.status not in ['draft', 'preview']:
            return Response({'error': 'Only draft or preview payroll can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
        previous = {'status': payroll.status}
        payroll.status = 'approved'
        payroll.approved_by = request.user
        payroll.approved_at = timezone.now()
        payroll.save()
        log_payroll_action(payroll, request.user, 'payroll_approved', previous, {'status': payroll.status})
        self._notify_staff(payroll, 'Payroll Processed', f'Your payroll for {payroll.month}/{payroll.year} has been processed.')
        return Response(self.get_serializer(payroll).data)

    @action(detail=True, methods=['post'])
    def lock(self, request, pk=None):
        if not can_manage_payroll(request.user):
            return Response({'error': 'You do not have permission to lock payroll.'}, status=status.HTTP_403_FORBIDDEN)
        payroll = self.get_object()
        if payroll.status not in ['approved', 'processing']:
            return Response({'error': 'Approve payroll before locking it.'}, status=status.HTTP_400_BAD_REQUEST)
        previous = {'status': payroll.status}
        payroll.status = 'locked'
        payroll.locked_at = timezone.now()
        payroll.save()
        log_payroll_action(payroll, request.user, 'payroll_locked', previous, {'status': payroll.status})
        return Response(self.get_serializer(payroll).data)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        if not can_manage_payroll(request.user):
            return Response({'error': 'You do not have permission to process payroll payments.'}, status=status.HTTP_403_FORBIDDEN)
        payroll = self.get_object()
        if payroll.status == 'paid':
            return Response({'error': 'Payroll is already marked as paid.'}, status=status.HTTP_400_BAD_REQUEST)
        previous = {'status': payroll.status, 'payment_date': str(payroll.payment_date), 'payment_reference': payroll.payment_reference}
        payroll.status = 'paid'
        payroll.payment_date = timezone.now().date()
        payroll.payment_reference = (
            request.data.get('payment_reference') or
            payroll.payment_reference or
            f"PAY-{payroll.year}{payroll.month:02d}-{str(payroll.id)[:8].upper()}"
        )
        payroll.payment_method = request.data.get('payment_method', payroll.payment_method)
        payroll.save()
        log_payroll_action(payroll, request.user, 'salary_payment_processed', previous, {
            'status': payroll.status,
            'payment_date': str(payroll.payment_date),
            'payment_reference': payroll.payment_reference,
        })
        self._notify_staff(
            payroll, 'Salary Paid',
            f'Your salary of ₦{float(payroll.net_salary):,.2f} for {payroll.month}/{payroll.year} has been paid. '
            f'Reference: {payroll.payment_reference}. A payslip is now available in your portal.'
        )
        return Response({'message': 'Payroll marked as paid.', 'payment_date': str(payroll.payment_date), 'payment_reference': payroll.payment_reference})

    @action(detail=True, methods=['post'])
    def reverse(self, request, pk=None):
        if not can_manage_payroll(request.user):
            return Response({'error': 'You do not have permission to reverse payroll.'}, status=status.HTTP_403_FORBIDDEN)
        payroll = self.get_object()
        if payroll.status not in ['paid', 'failed']:
            return Response({'error': 'Only paid or failed payroll can be reversed.'}, status=status.HTTP_400_BAD_REQUEST)
        previous = {'status': payroll.status, 'payment_reference': payroll.payment_reference}
        payroll.status = 'reversed'
        payroll.notes = request.data.get('reason', payroll.notes)
        payroll.save()
        log_payroll_action(payroll, request.user, 'payroll_reversed', previous, {'status': payroll.status, 'reason': payroll.notes})
        self._notify_staff(payroll, 'Payroll Adjusted', f'Your payroll for {payroll.month}/{payroll.year} has been adjusted. Please contact HR for details.')
        return Response(self.get_serializer(payroll).data)

    @action(detail=True, methods=['post'])
    def recalculate(self, request, pk=None):
        """Force recalculate and update salary structure from request data, then save."""
        if not can_manage_payroll(request.user):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        payroll = self.get_object()
        if payroll.status in ['paid', 'locked']:
            return Response({'error': 'Cannot recalculate a locked or paid payroll.'}, status=status.HTTP_400_BAD_REQUEST)

        previous = PayrollDetailSerializer(payroll).data

        # Apply all salary structure fields from request body if provided
        salary_fields = [
            'basic_salary', 'housing_allowance', 'transport_allowance',
            'meal_allowance', 'responsibility_allowance', 'overtime', 'bonuses',
            'tax', 'pension', 'loans', 'other_deductions', 'deductions',
            'leave_adjustment', 'attendance_adjustment', 'salary_grade',
            'department', 'payment_schedule', 'due_date', 'notes',
        ]
        for field in salary_fields:
            if field in request.data:
                val = request.data[field]
                if field not in ('salary_grade', 'department', 'payment_schedule', 'due_date', 'notes') and val is not None:
                    try:
                        val = Decimal(str(val))
                    except Exception:
                        return Response({'error': f'Invalid value for {field}.'}, status=status.HTTP_400_BAD_REQUEST)
                setattr(payroll, field, val)

        payroll.save()
        log_payroll_action(payroll, request.user, 'payroll_recalculated', previous, PayrollDetailSerializer(payroll).data)
        return Response(PayrollDetailSerializer(payroll).data)

    @action(detail=True, methods=['get'])
    def payslip(self, request, pk=None):
        payroll = self.get_object()
        if request.user.role == 'teacher' and payroll.teacher_id != request.user.id:
            return Response({'error': 'You can only view your own payslips.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(PayrollDetailSerializer(payroll).data)

    @action(detail=True, methods=['get'])
    def audit_logs(self, request, pk=None):
        if not can_manage_payroll(request.user):
            return Response({'error': 'You do not have permission to view payroll audit logs.'}, status=status.HTTP_403_FORBIDDEN)
        payroll = self.get_object()
        return Response(PayrollAuditLogSerializer(payroll.audit_logs.all(), many=True).data)

    # ── Bulk Operations ───────────────────────────────────────────────────────

    @action(detail=False, methods=['post'])
    def bulk_pay(self, request):
        """Mark multiple payroll records as paid in one call."""
        if not can_manage_payroll(request.user):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        ids = request.data.get('ids', [])
        payment_method = request.data.get('payment_method', 'bank_transfer')
        if not ids:
            return Response({'error': 'No payroll IDs provided.'}, status=status.HTTP_400_BAD_REQUEST)

        records = Payroll.objects.filter(id__in=ids).exclude(status__in=['paid', 'reversed', 'cancelled'])
        paid_count = 0
        for payroll in records:
            previous = {'status': payroll.status}
            payroll.status = 'paid'
            payroll.payment_date = timezone.now().date()
            payroll.payment_method = payment_method
            payroll.payment_reference = f"BULK-{payroll.year}{payroll.month:02d}-{str(payroll.id)[:8].upper()}"
            payroll.save()
            log_payroll_action(payroll, request.user, 'salary_payment_processed', previous, {'status': 'paid', 'method': payment_method})
            self._notify_staff(
                payroll, 'Salary Paid',
                f'Your salary of ₦{float(payroll.net_salary):,.2f} for {payroll.month}/{payroll.year} has been paid. '
                f'Reference: {payroll.payment_reference}.'
            )
            paid_count += 1

        return Response({'message': f'{paid_count} payroll record(s) marked as paid.', 'paid_count': paid_count})

    @action(detail=False, methods=['post'])
    def bulk_approve(self, request):
        """Approve multiple draft/preview payroll records."""
        if not can_manage_payroll(request.user):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No payroll IDs provided.'}, status=status.HTTP_400_BAD_REQUEST)

        records = Payroll.objects.filter(id__in=ids, status__in=['draft', 'preview'])
        count = 0
        for payroll in records:
            previous = {'status': payroll.status}
            payroll.status = 'approved'
            payroll.approved_by = request.user
            payroll.approved_at = timezone.now()
            payroll.save()
            log_payroll_action(payroll, request.user, 'payroll_approved', previous, {'status': 'approved'})
            self._notify_staff(payroll, 'Payroll Approved', f'Your payroll for {payroll.month}/{payroll.year} has been approved.')
            count += 1

        return Response({'message': f'{count} payroll record(s) approved.', 'approved_count': count})

    # ── My Salary (Teacher Self-Service) ──────────────────────────────────────

    @action(detail=False, methods=['get'])
    def my_salary(self, request):
        if getattr(request.user, 'role', None) != 'teacher':
            return Response({'error': 'Only teachers can access personal salary records here.'}, status=status.HTTP_403_FORBIDDEN)
        records = Payroll.objects.filter(teacher=request.user).order_by('-year', '-month')
        latest = records.first()
        paid_records = records.filter(status='paid')
        return Response({
            'current_salary_status': latest.status if latest else 'not_generated',
            'last_salary_payment': PayrollDetailSerializer(paid_records.first()).data if paid_records.exists() else None,
            'current_payslip': PayrollDetailSerializer(latest).data if latest else None,
            'payroll_history': PayrollSerializer(records, many=True).data,
        })

    # ── Generate Monthly ──────────────────────────────────────────────────────

    @action(detail=False, methods=['post'])
    def generate_monthly(self, request):
        """Auto-generate payroll for all active staff for a given month/year."""
        if not can_manage_payroll(request.user):
            return Response({'error': 'You do not have permission to generate payroll.'}, status=status.HTTP_403_FORBIDDEN)
        month = request.data.get('month', timezone.now().month)
        year = request.data.get('year', timezone.now().year)
        due_date = request.data.get('due_date')
        include_admin = request.data.get('include_admin', False)

        from accounts.models import User
        role_filter = ['teacher']
        if include_admin:
            role_filter.append('admin')
        staff = User.objects.filter(role__in=role_filter, is_active=True)

        created_count = 0
        skipped_count = 0
        for member in staff:
            salary = Decimal('0.00')
            if hasattr(member, 'teacher_profile') and member.teacher_profile.monthly_salary:
                salary = member.teacher_profile.monthly_salary

            _, created = Payroll.objects.get_or_create(
                teacher=member,
                month=month,
                year=year,
                defaults={
                    'basic_salary': salary or Decimal('50000.00'),
                    'bonuses': 0,
                    'deductions': 0,
                    'status': 'draft',
                    'department': request.data.get('department') or (
                        'Teaching' if member.role == 'teacher' else 'Administration'
                    ),
                    'salary_grade': request.data.get('salary_grade') or None,
                    'due_date': due_date or None,
                }
            )
            if created:
                created_count += 1
                payroll_obj = Payroll.objects.get(teacher=member, month=month, year=year)
                log_payroll_action(payroll_obj, request.user, 'payroll_generation', updated_value={'month': month, 'year': year})
            else:
                skipped_count += 1

        return Response({
            'message': f'Generated payroll for {created_count} staff member(s). {skipped_count} already existed.',
            'created': created_count,
            'skipped': skipped_count,
        })

    # ── Reports ───────────────────────────────────────────────────────────────

    @action(detail=False, methods=['get'])
    def reports(self, request):
        """Return structured payroll report data for the requested period."""
        if not can_view_payroll_analytics(request.user):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        now = timezone.now()
        month = int(request.query_params.get('month', now.month))
        year = int(request.query_params.get('year', now.year))
        report_type = request.query_params.get('type', 'monthly_summary')

        records = Payroll.objects.select_related('teacher').filter(month=month, year=year)

        if report_type == 'monthly_summary':
            total_basic = sum(r.basic_salary for r in records)
            total_allowances = sum(r.total_allowances for r in records)
            total_bonuses = sum(r.total_bonuses for r in records)
            total_deductions = sum(r.total_deductions for r in records)
            total_tax = sum(r.tax for r in records)
            total_pension = sum(r.pension for r in records)
            total_net = sum(r.net_salary for r in records)
            return Response({
                'report_type': report_type,
                'month': month,
                'year': year,
                'total_staff': records.count(),
                'staff_paid': records.filter(status='paid').count(),
                'total_basic_salary': float(total_basic),
                'total_allowances': float(total_allowances),
                'total_bonuses': float(total_bonuses),
                'total_deductions': float(total_deductions),
                'total_tax': float(total_tax),
                'total_pension': float(total_pension),
                'total_net_salary': float(total_net),
            })

        elif report_type == 'salary_register':
            data = []
            for r in records.order_by('teacher__last_name'):
                profile = getattr(r.teacher, 'teacher_profile', None)
                data.append({
                    'staff_id': getattr(profile, 'staff_id', r.teacher.username),
                    'full_name': r.teacher.full_name,
                    'role': r.teacher.role,
                    'department': r.department or 'Teaching',
                    'basic_salary': float(r.basic_salary),
                    'total_allowances': float(r.total_allowances),
                    'bonuses': float(r.bonuses),
                    'gross_salary': float(r.gross_salary),
                    'total_deductions': float(r.total_deductions),
                    'net_salary': float(r.net_salary),
                    'status': r.status,
                    'payment_date': str(r.payment_date) if r.payment_date else None,
                    'payment_reference': r.payment_reference,
                })
            return Response({'report_type': report_type, 'month': month, 'year': year, 'records': data})

        elif report_type == 'deduction_report':
            data = []
            for r in records.order_by('teacher__last_name'):
                profile = getattr(r.teacher, 'teacher_profile', None)
                data.append({
                    'staff_id': getattr(profile, 'staff_id', r.teacher.username),
                    'full_name': r.teacher.full_name,
                    'tax': float(r.tax),
                    'pension': float(r.pension),
                    'loans': float(r.loans),
                    'other_deductions': float(r.other_deductions),
                    'leave_adjustment': float(r.leave_adjustment),
                    'attendance_adjustment': float(r.attendance_adjustment),
                    'total_deductions': float(r.total_deductions),
                })
            return Response({'report_type': report_type, 'month': month, 'year': year, 'records': data})

        elif report_type == 'allowance_report':
            data = []
            for r in records.order_by('teacher__last_name'):
                profile = getattr(r.teacher, 'teacher_profile', None)
                data.append({
                    'staff_id': getattr(profile, 'staff_id', r.teacher.username),
                    'full_name': r.teacher.full_name,
                    'housing_allowance': float(r.housing_allowance),
                    'transport_allowance': float(r.transport_allowance),
                    'meal_allowance': float(r.meal_allowance),
                    'responsibility_allowance': float(r.responsibility_allowance),
                    'overtime': float(r.overtime),
                    'total_allowances': float(r.total_allowances),
                })
            return Response({'report_type': report_type, 'month': month, 'year': year, 'records': data})

        return Response({'error': f'Unknown report type: {report_type}'}, status=status.HTTP_400_BAD_REQUEST)

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _notify_staff(self, payroll, title, message):
        try:
            from accounts.models import Notification
            Notification.objects.create(
                sender=self.request.user,
                recipient=payroll.teacher,
                title=title,
                message=message,
                category='finance',
                audience='selected'
            )
        except Exception as exc:
            print(f"Error sending payroll notification: {exc}")
