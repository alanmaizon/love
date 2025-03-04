from django.contrib import admin
from .models import Charity, Donation

@admin.register(Charity)
class CharityAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'website')
    search_fields = ('name',)

    
@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = ('donor_name', 'donor_email', 'amount', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('donor_name', 'donor_email')