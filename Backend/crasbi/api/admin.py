from django.contrib import admin
from .models import SourceConnection, Job, JobExecution

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

@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ['job_name', 'source', 'source_table', 'target_table', 'created_by', 'created_at']
    list_filter = ['source', 'created_at', 'updated_at']
    search_fields = ['job_name', 'source_table', 'target_table']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Job Details', {
            'fields': ('job_name', 'source')
        }),
        ('Tables', {
            'fields': ('source_table', 'target_table')
        }),
        ('Query', {
            'fields': ('job_query',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

@admin.register(JobExecution)
class JobExecutionAdmin(admin.ModelAdmin):
    list_display = ['job_name', 'source_name', 'status', 'records_processed', 'execution_time_seconds', 'executed_by', 'executed_at']
    list_filter = ['status', 'executed_at', 'completed_at', 'source_name']
    search_fields = ['job_name', 'source_name', 'executed_by']
    ordering = ['-executed_at']
    readonly_fields = ['executed_at', 'completed_at', 'execution_time_seconds']
    
    fieldsets = (
        ('Execution Details', {
            'fields': ('job', 'source_name', 'job_name', 'status')
        }),
        ('Results', {
            'fields': ('records_processed', 'execution_time_seconds')
        }),
        ('Timing', {
            'fields': ('executed_at', 'completed_at')
        }),
        ('User & Logs', {
            'fields': ('executed_by', 'error_message', 'execution_log'),
            'classes': ('collapse',)
        }),
    )
    
    def has_add_permission(self, request):
        # Job executions are created automatically by the ETL process
        return False
