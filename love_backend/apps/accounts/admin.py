from django.contrib import admin

from .models import OrgMembership, UserProfile


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    readonly_fields = ("verification_token", "token_created_at")


@admin.register(OrgMembership)
class OrgMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "charity", "role", "created_at")
    list_filter = ("role",)
    search_fields = ("user__username", "charity__name")
