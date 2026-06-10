# Generated migration for EnrollmentRequest model

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0009_rename_accounts_no_recipie_756ff2_idx_accounts_no_recipie_8b48cc_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='enrollmentrequest',
            name='approval_date',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='enrollmentrequest',
            name='parent_user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='enrollment_requests', to=settings.AUTH_USER_MODEL),
        ),
    ]
