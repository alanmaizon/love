from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Charity, Donation,
    PayoutAccount, LedgerEntry, Receipt, Payout,
)

@admin.register(Charity)
class CharityAdmin(admin.ModelAdmin):
    list_display = ('name', 'verification_status', 'is_active', 'slug', 'display_logo')
    list_filter = ('verification_status', 'is_active')
    search_fields = ('name', 'slug', 'registration_number')
    prepopulated_fields = {'slug': ('name',)}

    def display_logo(self, obj):
        logo_url = obj.get_logo_url()
        if logo_url:
            return format_html('<img src="{}" style="max-height: 50px;"/>', logo_url)
        return "No Logo"
    display_logo.short_description = "Logo"

@admin.register(Donation)
class DonationAdmin(admin.ModelAdmin):
    list_display = ('donor_name', 'charity', 'campaign', 'amount', 'status', 'created_at')
    list_filter = ('status', 'charity', 'campaign')
    search_fields = ('donor_name', 'donor_email', 'charity__name')
    ordering = ('-created_at',)
    actions = ['mark_as_confirmed', 'mark_as_failed', 'delete_selected']

    def mark_as_confirmed(self, request, queryset):
        updated_count = queryset.update(status='confirmed')
        self.message_user(
            request,
            f"{updated_count} donation(s) marked confirmed — legacy only; does NOT write "
            "LedgerEntry or trigger receipts. Use Stripe webhooks for real money.",
            level="WARNING",
        )
    mark_as_confirmed.short_description = "Mark as Confirmed (legacy — no ledger)"

    def mark_as_failed(self, request, queryset):
        updated_count = queryset.update(status='failed')
        self.message_user(request, f"{updated_count} donations marked as failed.")
    mark_as_failed.short_description = "Mark selected as Failed"

    def delete_selected(self, request, queryset):
        deleted_count = queryset.delete()[0]  # Delete and return the number of deleted rows
        self.message_user(request, f"{deleted_count} donations deleted successfully.")
    delete_selected.short_description = "Delete selected donations"


@admin.register(PayoutAccount)
class PayoutAccountAdmin(admin.ModelAdmin):
    list_display = ('charity', 'stripe_account_id', 'charges_enabled',
                    'payouts_enabled', 'details_submitted', 'updated_at')
    search_fields = ('charity__name', 'stripe_account_id')


@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'entry_type', 'account', 'amount', 'currency', 'donation')
    list_filter = ('entry_type', 'account', 'currency')
    # Append-only: ledger rows must never be edited or deleted from the admin.
    def has_view_permission(self, request, obj=None):
        return request.user.is_staff

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ('number', 'donation', 'tax_year', 'issued_at')
    search_fields = ('number',)


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ('charity', 'amount', 'currency', 'status', 'arrival_date', 'created_at')
    list_filter = ('status', 'currency')
    search_fields = ('charity__name', 'stripe_payout_id')