from django.contrib import admin
from .models import StudentAttendance, TeacherAttendance

@admin.register(StudentAttendance)
class StudentAttendanceAdmin(admin.ModelAdmin):
    list_display = ('student', 'school_class', 'date', 'status', 'term')
    list_filter = ('status', 'school_class', 'date', 'term')
    search_fields = ('student__first_name', 'student__last_name', 'student__email')
    date_hierarchy = 'date'

@admin.register(TeacherAttendance)
class TeacherAttendanceAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'date', 'status', 'check_in_time', 'check_out_time')
    list_filter = ('status', 'date')
    search_fields = ('teacher__first_name', 'teacher__last_name', 'teacher__email')
    date_hierarchy = 'date'
