from django.db import models
from django.contrib.auth.models import User

# v2: the single-couple Profile model (incl. plaintext bank_name/account_number/
# revolut_username) was retired in CP3 in favour of Campaign. Bank data is never
# stored — payout identity lives in PayoutAccount as a Stripe account id only.


class Charity(models.Model):
    """The organization tenant. Money can only ever reach a *verified* charity."""

    UNVERIFIED = "unverified"
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    SUSPENDED = "suspended"
    VERIFICATION_CHOICES = [
        (UNVERIFIED, "Unverified"),
        (PENDING, "Pending"),
        (VERIFIED, "Verified"),
        (REJECTED, "Rejected"),
        (SUSPENDED, "Suspended"),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    website = models.URLField(blank=True)
    logo = models.ImageField(
        upload_to='charity_logos',
        blank=True,
        null=True
    )
    # --- v2 additive fields (nullable/defaulted; backfilled in CP2) ---
    slug = models.SlugField(max_length=255, unique=True, null=True, blank=True)
    country = models.CharField(max_length=2, blank=True, default="")  # ISO-3166-1 alpha-2
    registration_number = models.CharField(max_length=100, blank=True, default="")
    verification_status = models.CharField(
        max_length=20, choices=VERIFICATION_CHOICES, default=UNVERIFIED
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    contact_email = models.EmailField(blank=True, default="")  # ops contact, never public
    is_active = models.BooleanField(default=True)

    def get_logo_url(self):
        if self.logo:
            return self.logo.url
        return None

    @property
    def is_verified(self):
        return self.verification_status == self.VERIFIED

    class Meta:
        verbose_name_plural = "Charities"

    def __str__(self):
        return self.name


class PayoutAccount(models.Model):
    """
    Stripe Connect payout identity for a charity. We store ONLY the Stripe
    account id + capability flags — never raw bank/account numbers.
    """

    charity = models.OneToOneField(
        Charity, on_delete=models.CASCADE, related_name="payout_account"
    )
    stripe_account_id = models.CharField(max_length=255, unique=True)
    charges_enabled = models.BooleanField(default=False)
    payouts_enabled = models.BooleanField(default=False)
    details_submitted = models.BooleanField(default=False)  # gate "publish" on this
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"PayoutAccount({self.charity} -> {self.stripe_account_id})"


class Donation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='donations', null=True, blank=True)
    charity = models.ForeignKey(
        'Charity', on_delete=models.PROTECT, related_name='donations',
    )
    # v2: every donation belongs to a campaign (nullable until CP2 backfill,
    # then tightened to NOT NULL in CP3). PROTECT: never cascade-delete money.
    campaign = models.ForeignKey(
        'campaigns.Campaign',
        on_delete=models.PROTECT,
        related_name='donations',
        null=True,
        blank=True,
    )
    donor_name = models.CharField(max_length=255)
    donor_email = models.EmailField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="EUR")
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ], default='pending')
    # --- v2 Stripe / money fields ---
    stripe_payment_intent_id = models.CharField(
        max_length=255, null=True, blank=True, unique=True
    )
    platform_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    stripe_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    is_anonymous = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["campaign", "status"]),
            models.Index(fields=["charity", "status"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        return f"Donation by {self.donor_name} - {self.amount}"


class LedgerEntry(models.Model):
    """
    Append-only money ledger — the source of truth, reconciled against Stripe.
    Rows are never updated or deleted in application code.
    """

    DONATION_RECEIVED = "donation_received"
    PLATFORM_FEE = "platform_fee"
    STRIPE_FEE = "stripe_fee"
    PAYOUT = "payout"
    REFUND = "refund"
    ENTRY_TYPE_CHOICES = [
        (DONATION_RECEIVED, "Donation received"),
        (PLATFORM_FEE, "Platform fee"),
        (STRIPE_FEE, "Stripe fee"),
        (PAYOUT, "Payout"),
        (REFUND, "Refund"),
    ]

    CHARITY = "charity"
    PLATFORM = "platform"
    STRIPE = "stripe"
    ACCOUNT_CHOICES = [
        (CHARITY, "Charity"),
        (PLATFORM, "Platform"),
        (STRIPE, "Stripe"),
    ]

    donation = models.ForeignKey(
        Donation, on_delete=models.PROTECT, related_name="ledger_entries",
        null=True, blank=True,
    )
    entry_type = models.CharField(max_length=30, choices=ENTRY_TYPE_CHOICES)
    account = models.CharField(max_length=20, choices=ACCOUNT_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)  # signed
    currency = models.CharField(max_length=3, default="EUR")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("created_at",)
        verbose_name_plural = "Ledger entries"
        indexes = [models.Index(fields=["account", "entry_type"])]

    def __str__(self):
        return f"{self.entry_type} {self.amount} {self.currency} [{self.account}]"


class Receipt(models.Model):
    donation = models.OneToOneField(
        Donation, on_delete=models.PROTECT, related_name="receipt"
    )
    number = models.CharField(max_length=64, unique=True)
    pdf_url = models.URLField(blank=True)
    tax_year = models.PositiveIntegerField(null=True, blank=True)
    issued_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Receipt {self.number}"


class Payout(models.Model):
    """Mirror of a Stripe payout to a charity, for ops visibility."""

    charity = models.ForeignKey(
        Charity, on_delete=models.PROTECT, related_name="payouts"
    )
    stripe_payout_id = models.CharField(max_length=255, unique=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="EUR")
    status = models.CharField(max_length=30, blank=True)
    arrival_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payout {self.amount} {self.currency} -> {self.charity}"
