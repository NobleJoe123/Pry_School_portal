import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from academics.models import Term, ClassLevel

class FeeType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE, related_name='fees')

    def __str__(self):
        return f"{self.name} - {self.amount}"

class StudentFee(models.Model):
    STATUS_CHOICES = [
        ('paid', 'Fully Paid'),
        ('partial', 'Partially Paid'),
        ('outstanding', 'Outstanding'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        limit_choices_to={'role': 'student'},
        related_name='assigned_fees'
    )
    fee_type = models.ForeignKey(FeeType, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='outstanding')
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    @property
    def balance(self):
        return self.fee_type.amount - self.amount_paid

    class Meta:
        unique_together = ('student', 'fee_type', 'term')

    def __str__(self):
        return f"{self.student.full_name} - {self.fee_type.name} ({self.status})"

class PaymentRecord(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('transfer', 'Bank Transfer'),
        ('card', 'Card Payment'),
        ('online', 'Online Gateway'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student_fee = models.ForeignKey(StudentFee, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    date = models.DateTimeField(default=timezone.now)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        limit_choices_to={'role': 'admin'}
    )

    def __str__(self):
        return f"Payment of {self.amount} for {self.student_fee.student.full_name}"

class Payroll(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        limit_choices_to={'role': 'teacher'},
        related_name='payrolls'
    )
    month = models.IntegerField()
    year = models.IntegerField()
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    bonuses = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    payment_date = models.DateField(blank=True, null=True)

    @property
    def net_salary(self):
        return self.basic_salary + self.bonuses - self.deductions

    class Meta:
        unique_together = ('teacher', 'month', 'year')

    def __str__(self):
        return f"Payroll: {self.teacher.full_name} ({self.month}/{self.year})"
