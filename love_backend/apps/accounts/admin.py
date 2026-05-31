from django.contrib import admin

from .models import OrgMembership


@admin.register(OrgMembership)
class OrgMembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "charity", "role", "created_at")
    list_filter = ("role",)
    search_fields = ("user__username", "charity__name")
