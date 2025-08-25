from django.contrib import admin
from .models import SourceConnection

@admin.register(SourceConnection)
class SourceConnectionAdmin(admin.ModelAdmin):
    list_display = ['source_name', 'db_type', 'host', 'port', 'username', 'is_active', 'inserted_by', 'created_at']
    list_filter = ['db_type', 'is_active', 'created_at', 'updated_at']
    search_fields = ['source_name', 'host', 'username']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at', 'inserted_by']
    list_editable = ['is_active']
    
    fieldsets = (
        ('Connection Details', {
            'fields': ('source_name', 'db_type', 'host', 'port')
        }),
        ('Authentication', {
            'fields': ('username', 'password')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('inserted_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # If creating new object
            obj.inserted_by = request.user.username
        super().save_model(request, obj, form, change)
