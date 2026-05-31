"""
Stripe webhook dedupe + processing log.

Webhooks must be idempotent: Stripe may deliver the same event more than once.
We record every event id and only process it once (unique constraint).
"""
from django.db import models


class WebhookEvent(models.Model):
    RECEIVED = "received"
    PROCESSED = "processed"
    IGNORED = "ignored"
    FAILED = "failed"
    STATUS_CHOICES = [
        (RECEIVED, "Received"),
        (PROCESSED, "Processed"),
        (IGNORED, "Ignored"),
        (FAILED, "Failed"),
    ]

    stripe_event_id = models.CharField(max_length=255, unique=True)
    event_type = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=RECEIVED)
    payload = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [models.Index(fields=["event_type", "status"])]

    def __str__(self):
        return f"{self.event_type} {self.stripe_event_id} [{self.status}]"
