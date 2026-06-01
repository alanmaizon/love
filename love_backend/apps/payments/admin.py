from django.contrib import admin

from .models import WebhookEvent


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ("created_at", "event_type", "stripe_event_id", "status", "processed_at")
    list_filter = ("status", "event_type")
    search_fields = ("stripe_event_id",)
    readonly_fields = ("stripe_event_id", "event_type", "payload", "created_at", "processed_at")

    def has_view_permission(self, request, obj=None):
        return request.user.is_staff

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
