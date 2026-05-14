from django.contrib import admin
from .models import FeeType, StudentFee, PaymentRecord, Payroll

@admin.register(FeeType)
class FeeTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'amount', 'level')
    list_filter = ('level',)
    search_fields = ('name',)

@admin.register(StudentFee)
class StudentFeeAdmin(admin.ModelAdmin):
    list_display = ('student', 'fee_type', 'term', 'status', 'amount_paid')
    list_filter = ('status', 'term', 'fee_type')
    search_fields = ('student__email', 'student__first_name', 'student__last_name')

@admin.register(PaymentRecord)
class PaymentRecordAdmin(admin.ModelAdmin):
    list_display = ('student_fee', 'amount', 'payment_method', 'date', 'received_by')
    list_filter = ('payment_method', 'date')
    search_fields = ('transaction_id', 'student_fee__student__email')

@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'month', 'year', 'status', 'net_salary')
    list_filter = ('status', 'month', 'year')
    search_fields = ('teacher__email', 'teacher__first_name', 'teacher__last_name')
