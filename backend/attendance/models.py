import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from academics.models import SchoolClass, Term

class StudentAttendance(models.Model):
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('excused', 'Excused'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        limit_choices_to={'role': 'student'},
        related_name='student_attendance'
    )
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE)
    date = models.DateField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present')
    remarks = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        unique_together = ('student', 'date')
        verbose_name_plural = "Student Attendance"

    def __str__(self):
        return f"{self.student.full_name} - {self.date} ({self.status})"

class TeacherAttendance(models.Model):
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('on_leave', 'On Leave'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        limit_choices_to={'role': 'teacher'},
        related_name='teacher_attendance'
    )
    date = models.DateField(default=timezone.now)
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present')

    class Meta:
        unique_together = ('teacher', 'date')
        verbose_name_plural = "Teacher Attendance"

    def __str__(self):
        return f"{self.teacher.full_name} - {self.date}"
