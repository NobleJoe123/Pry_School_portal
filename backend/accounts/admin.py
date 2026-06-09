from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'recipient', 'sender', 'category', 'is_read', 'created_at')
    list_filter = ('category', 'audience', 'is_read', 'created_at')
    search_fields = ('title', 'message', 'recipient__email', 'recipient__first_name', 'recipient__last_name')
