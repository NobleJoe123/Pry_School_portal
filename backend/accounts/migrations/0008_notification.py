import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0007_teacherprofile_title'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=180)),
                ('message', models.TextField()),
                ('category', models.CharField(choices=[('general', 'General'), ('attendance', 'Attendance'), ('finance', 'Finance'), ('academics', 'Academics'), ('enrollment', 'Enrollment')], default='general', max_length=20)),
                ('audience', models.CharField(choices=[('selected', 'Selected Users'), ('all_teachers', 'All Teachers'), ('all_parents', 'All Parents'), ('all_students', 'All Students'), ('all_staff', 'All Staff')], default='selected', max_length=20)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('read_at', models.DateTimeField(blank=True, null=True)),
                ('recipient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
                ('sender', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sent_notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['recipient', 'is_read'], name='accounts_no_recipie_756ff2_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['category'], name='accounts_no_categor_1da871_idx'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['created_at'], name='accounts_no_created_8ab503_idx'),
        ),
    ]
