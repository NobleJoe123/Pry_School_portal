import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
from django.utils import timezone

class AcademicYear(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=20, unique=True, help_text="e.g. 2025/2026")
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.is_current:
            AcademicYear.objects.exclude(id=self.id).update(is_current=False)
        super().save(*args, **kwargs)

class Term(models.Model):
    TERM_CHOICES = [
        ('1st Term', 'First Term'),
        ('2nd Term', 'Second Term'),
        ('3rd Term', 'Third Term'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='terms')
    name = models.CharField(max_length=20, choices=TERM_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)

    class Meta:
        unique_together = ('academic_year', 'name')
        ordering = ['start_date']

    def __str__(self):
        return f"{self.name} ({self.academic_year.name})"

    def save(self, *args, **kwargs):
        if self.is_current:
            Term.objects.exclude(id=self.id).update(is_current=False)
        super().save(*args, **kwargs)

class ClassLevel(models.Model):
    """e.g. Nursery 1, Primary 1"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    numeric_level = models.IntegerField(unique=True, help_text="Used for sorting classes")

    class Meta:
        ordering = ['numeric_level']

    def __str__(self):
        return self.name

class SchoolClass(models.Model):
    """e.g. Primary 1A, Primary 1B"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE, related_name='classes')
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        limit_choices_to={'role': 'teacher'},
        related_name='assigned_classes'
    )
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('name', 'academic_year')
        verbose_name_plural = "School Classes"

    def __str__(self):
        return f"{self.name} ({self.academic_year.name})"

class Subject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, unique=True)
    level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE, related_name='subjects')
    
    class Meta:
        unique_together = ('name', 'level')

    def __str__(self):
        return f"{self.name} ({self.level.name})"

class AssessmentType(models.Model):
    """e.g. CA 1, CA 2, Exam"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    max_score = models.IntegerField(default=100)
    weight = models.DecimalField(max_digits=5, decimal_places=2, help_text="Weight in percentage (0-100)")

    def __str__(self):
        return f"{self.name} ({self.weight}%)"

class Assessment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    assessment_type = models.ForeignKey(AssessmentType, on_delete=models.CASCADE)
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name='assessments')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='assessments')
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='assessments')
    date_administered = models.DateField(default=timezone.now)

    def __str__(self):
        return f"{self.name} - {self.subject.name} ({self.school_class.name})"

class StudentScore(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        limit_choices_to={'role': 'student'},
        related_name='scores'
    )
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name='scores')
    score_obtained = models.DecimalField(max_digits=5, decimal_places=2)
    remarks = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('student', 'assessment')

    def __str__(self):
        return f"{self.student.full_name} - {self.assessment.name}: {self.score_obtained}"


class ReportCard(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'student'},
        related_name='report_cards'
    )
    term = models.ForeignKey(
        Term,
        on_delete=models.CASCADE,
        related_name='report_cards'
    )
    remarks = models.TextField(blank=True, null=True)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'term')
        ordering = ['student__last_name', 'student__first_name']

    def __str__(self):
        return f"Report Card for {self.student.full_name} - {self.term.name}"


class SchoolEvent(models.Model):
    CATEGORY_CHOICES = [
        ('academic', 'Academic'),
        ('holiday', 'Holiday'),
        ('exam', 'Examination'),
        ('meeting', 'PTA/Meeting'),
        ('sports', 'Sports/Co-curricular'),
    ]

    AUDIENCE_CHOICES = [
        ('all', 'All (Teachers & Parents)'),
        ('teachers', 'Teachers Only'),
        ('parents', 'Parents Only'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True, null=True)
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    location = models.CharField(max_length=150, blank=True, null=True)
    organizer = models.CharField(max_length=150, blank=True, null=True)
    term = models.ForeignKey(
        Term,
        on_delete=models.CASCADE,
        related_name='events'
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default='academic'
    )
    audience = models.CharField(
        max_length=20,
        choices=AUDIENCE_CHOICES,
        default='all'
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='low'
    )
    is_published = models.BooleanField(default=True)
    is_important = models.BooleanField(default=False)
    notification_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date', 'title']

    def __str__(self):
        return f"{self.title} ({self.date})"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        trigger_notification = False
        
        if is_new and self.is_published and not self.notification_sent:
            trigger_notification = True
        elif not is_new and self.is_published and not self.notification_sent:
            try:
                old_instance = SchoolEvent.objects.get(pk=self.pk)
                if not old_instance.is_published:
                    trigger_notification = True
            except SchoolEvent.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        if trigger_notification:
            try:
                from accounts.models import Notification, User
                # Select target recipients
                recipients = User.objects.none()
                if self.audience == 'all':
                    recipients = User.objects.filter(role__in=['teacher', 'parent'], is_active=True)
                elif self.audience == 'teachers':
                    recipients = User.objects.filter(role='teacher', is_active=True)
                elif self.audience == 'parents':
                    recipients = User.objects.filter(role='parent', is_active=True)

                notifications = []
                for user in recipients:
                    time_str = f" at {self.start_time.strftime('%I:%M %p')}" if self.start_time else ""
                    loc_str = f" at {self.location}" if self.location else ""
                    msg = f"A new event has been scheduled: {self.title}.\nDate: {self.date.strftime('%B %d, %Y')}{time_str}{loc_str}."
                    if self.description:
                        msg += f"\n\nDescription: {self.description}"
                    
                    notifications.append(
                        Notification(
                            sender=None,
                            recipient=user,
                            title=f"Calendar: {self.title}",
                            message=msg,
                            category='academics',
                            audience='selected'
                        )
                    )
                if notifications:
                    Notification.objects.bulk_create(notifications)
                
                SchoolEvent.objects.filter(pk=self.pk).update(notification_sent=True)
            except Exception as e:
                print(f"Error sending event notifications: {e}")

