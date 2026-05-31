"""
Guest messages (the guestbook) as first-class, moderatable objects — extracted
from the prototype's free-text `Donation.message`. Public display is gated on
moderation_status so abuse can be held or removed without touching the donation.
"""
from django.db import models

from core.models import TimeStampedModel


class Message(TimeStampedModel):
    PENDING = "pending"
    APPROVED = "approved"
    AUTO_APPROVED = "auto_approved"
    REJECTED = "rejected"
    MODERATION_CHOICES = [
        (PENDING, "Pending"),
        (APPROVED, "Approved"),
        (AUTO_APPROVED, "Auto-approved"),
        (REJECTED, "Rejected"),
    ]

    #: states whose messages are safe to show publicly
    PUBLIC_STATES = (APPROVED, AUTO_APPROVED)

    campaign = models.ForeignKey(
        "campaigns.Campaign",
        on_delete=models.CASCADE,
        related_name="messages",
    )
    # Optional link to the donation that carried the message (null = standalone).
    donation = models.ForeignKey(
        "donations.Donation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="messages",
    )
    display_name = models.CharField(max_length=255)
    body = models.TextField()
    is_anonymous = models.BooleanField(default=False)
    moderation_status = models.CharField(
        max_length=20, choices=MODERATION_CHOICES, default=PENDING
    )
    moderation_score = models.FloatField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["campaign", "moderation_status", "published_at"]),
        ]

    def __str__(self):
        return f"{self.display_name}: {self.body[:40]}"
