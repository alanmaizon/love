from django.contrib import admin
from django.utils.html import format_html
from .models import Profile, Charity, Donation

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'display_profile_picture', 'bride_name', 'groom_name')

    def display_profile_picture(self, obj):
        url = obj.get_profile_picture_url()
        if url:
            return format_html('<img src="{}" style="max-height: 50px;"/>', url)
        return "No Image"
    display_profile_picture.short_description = "Profile Picture"

@admin.register(Charity)
class CharityAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_logo')

    def display_logo(self, obj):
        logo_url = obj.get_logo_url()
        if logo_url:
            return format_html('<img src="{}" style="max-height: 50px;"/>', logo_url)
        return "No Logo"
    display_logo.short_description = "Logo"

@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = ('donor_name', 'charity', 'amount', 'status', 'created_at')
    list_filter = ('status', 'charity')
    search_fields = ('donor_name', 'donor_email', 'charity__name')
    ordering = ('-created_at',)
    actions = ['mark_as_confirmed', 'mark_as_failed', 'delete_selected']

    def mark_as_confirmed(self, request, queryset):
        updated_count = queryset.update(status='confirmed')
        self.message_user(request, f"{updated_count} donations marked as confirmed.")
    mark_as_confirmed.short_description = "Mark selected as Confirmed"

    def mark_as_failed(self, request, queryset):
        updated_count = queryset.update(status='failed')
        self.message_user(request, f"{updated_count} donations marked as failed.")
    mark_as_failed.short_description = "Mark selected as Failed"

    def delete_selected(self, request, queryset):
        deleted_count = queryset.delete()[0]  # Delete and return the number of deleted rows
        self.message_user(request, f"{deleted_count} donations deleted successfully.")
    delete_selected.short_description = "Delete selected donations"