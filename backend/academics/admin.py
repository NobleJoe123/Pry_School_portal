from django.contrib import admin
from .models import BehaviorNote

@admin.register(BehaviorNote)
class BehaviorNoteAdmin(admin.ModelAdmin):
    list_display = ('student', 'teacher', 'category', 'created_at')
    list_filter = ('category', 'created_at')
    search_fields = ('student__first_name', 'student__last_name', 'teacher__first_name', 'note')
    readonly_fields = ('id', 'teacher', 'created_at')
    ordering = ('-created_at',)
