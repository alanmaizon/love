from django.contrib import admin
from django.utils.html import format_html
from .models import Profile, Charity

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'display_profile_picture', 'bride_name', 'groom_name')
    
    def display_profile_picture(self, obj):
        # Use the helper method to get the transformed URL or a default image.
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