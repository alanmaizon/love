from django.contrib import admin

from .models import Message


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("display_name", "campaign", "moderation_status", "created_at", "published_at")
    list_filter = ("moderation_status", "campaign")
    search_fields = ("display_name", "body")
    actions = ["approve_messages", "reject_messages"]

    @admin.action(description="Approve selected messages")
    def approve_messages(self, request, queryset):
        from django.utils import timezone
        n = queryset.update(moderation_status=Message.APPROVED, published_at=timezone.now())
        self.message_user(request, f"{n} message(s) approved.")

    @admin.action(description="Reject selected messages")
    def reject_messages(self, request, queryset):
        n = queryset.update(moderation_status=Message.REJECTED, published_at=None)
        self.message_user(request, f"{n} message(s) rejected.")
