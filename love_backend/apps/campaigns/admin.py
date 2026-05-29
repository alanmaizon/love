from django.contrib import admin

from .models import Campaign, CampaignBeneficiary


class CampaignBeneficiaryInline(admin.TabularInline):
    model = CampaignBeneficiary
    extra = 1


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "status", "visibility", "owner", "event_date")
    list_filter = ("type", "status", "visibility")
    search_fields = ("title", "slug", "owner__username")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [CampaignBeneficiaryInline]
