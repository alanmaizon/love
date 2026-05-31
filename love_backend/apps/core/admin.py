from django.contrib import admin

from .models import AuditLog, OutboxEvent


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "action", "actor", "target_type", "target_id")
    list_filter = ("action", "target_type")
    search_fields = ("action", "target_id")
    # Append-only.
    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(OutboxEvent)
class OutboxEventAdmin(admin.ModelAdmin):
    list_display = ("created_at", "event_type", "status", "attempts", "processed_at")
    list_filter = ("status", "event_type")
