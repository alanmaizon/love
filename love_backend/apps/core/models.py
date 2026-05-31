"""
Cross-cutting infrastructure shared by every app.

- TimeStampedModel: created_at/updated_at base for new models.
- TenantScopedManager: query helper that returns only the rows a given user is
  allowed to see. Enforcement lives in DRF get_queryset (CP3); this is the single
  source of truth for "what can this user see".
- AuditLog: append-only record of money / role / moderation actions.
- OutboxEvent: written in the SAME transaction as a state change, drained by a
  worker (receipts, emails, webhook side-effects) for reliable async.
"""
from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantScopedManager(models.Manager):
    """
    Base manager for tenant-owned models. Subclasses/usages provide `for_user`
    semantics; the default here returns everything for staff and nothing for
    anonymous users, so a missing override fails closed rather than leaking.
    """

    #: dotted lookup from this model to the owning User (override per model),
    #: e.g. "owner" on Campaign, "charity__memberships__user" on Donation.
    owner_field = None

    def for_user(self, user):
        if user is None or not getattr(user, "is_authenticated", False):
            return self.none()
        if user.is_staff:
            return self.all()
        if not self.owner_field:
            # Fail closed: a tenant model must declare how it maps to a user.
            return self.none()
        return self.filter(**{self.owner_field: user}).distinct()


class AuditLog(models.Model):
    """Append-only. Never updated or deleted in application code."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_actions",
    )
    action = models.CharField(max_length=100)
    target_type = models.CharField(max_length=100, blank=True)
    target_id = models.CharField(max_length=64, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    ip = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=["target_type", "target_id"]),
            models.Index(fields=["action"]),
        ]

    def __str__(self):
        return f"{self.action} @ {self.created_at:%Y-%m-%d %H:%M}"


class OutboxEvent(models.Model):
    """Transactional outbox: enqueue side-effects atomically with state changes."""

    PENDING = "pending"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"
    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (PROCESSING, "Processing"),
        (DONE, "Done"),
        (FAILED, "Failed"),
    ]

    event_type = models.CharField(max_length=100)
    payload = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)
    attempts = models.PositiveIntegerField(default=0)
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("created_at",)
        indexes = [models.Index(fields=["status", "created_at"])]

    def __str__(self):
        return f"{self.event_type} [{self.status}]"
