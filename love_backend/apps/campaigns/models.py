"""
Campaign generalizes the prototype's single `Profile` into a multi-tenant
fundraiser owned by a host (with optional co-hosts), benefiting one or more
verified charities.
"""
from django.conf import settings
from django.db import models
from django.db.models import Q
from cloudinary_storage.storage import MediaCloudinaryStorage

from core.models import TimeStampedModel, TenantScopedManager


class CampaignManager(TenantScopedManager):
    def for_user(self, user):
        if user is None or not getattr(user, "is_authenticated", False):
            return self.none()
        if user.is_staff:
            return self.all()
        # Hosts see their own campaigns; co-hosts see ones they help run.
        return self.filter(Q(owner=user) | Q(cohosts=user)).distinct()


class Campaign(TimeStampedModel):
    WEDDING = "wedding"
    BIRTHDAY = "birthday"
    MEMORIAL = "memorial"
    ANNIVERSARY = "anniversary"
    GENERAL = "general"
    TYPE_CHOICES = [
        (WEDDING, "Wedding"),
        (BIRTHDAY, "Birthday"),
        (MEMORIAL, "Memorial"),
        (ANNIVERSARY, "Anniversary"),
        (GENERAL, "General"),
    ]

    PUBLIC = "public"
    UNLISTED = "unlisted"
    PRIVATE = "private"
    VISIBILITY_CHOICES = [
        (PUBLIC, "Public"),
        (UNLISTED, "Unlisted"),
        (PRIVATE, "Private"),
    ]

    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"
    STATUS_CHOICES = [
        (DRAFT, "Draft"),
        (ACTIVE, "Active"),
        (CLOSED, "Closed"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="campaigns",
    )
    cohosts = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="cohosted_campaigns",
        blank=True,
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=WEDDING)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    story = models.TextField(blank=True)
    cover_image = models.ImageField(
        upload_to="campaign_covers",
        storage=MediaCloudinaryStorage(),
        blank=True,
        null=True,
    )
    event_date = models.DateField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    goal_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default="EUR")
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default=PUBLIC)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=DRAFT)

    objects = CampaignManager()

    class Meta:
        indexes = [
            models.Index(fields=["visibility", "status"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self):
        return self.title


class CampaignBeneficiary(models.Model):
    """
    Which charities a campaign funds, with an optional split. v1 UI is
    single-charity; the model supports splits so we never re-migrate.
    """

    campaign = models.ForeignKey(
        Campaign,
        on_delete=models.CASCADE,
        related_name="beneficiaries",
    )
    charity = models.ForeignKey(
        "donations.Charity",
        on_delete=models.PROTECT,
        related_name="campaign_links",
    )
    split_percent = models.DecimalField(max_digits=5, decimal_places=2, default=100)

    class Meta:
        unique_together = ("campaign", "charity")
        verbose_name_plural = "Campaign beneficiaries"

    def __str__(self):
        return f"{self.campaign} -> {self.charity} ({self.split_percent}%)"
