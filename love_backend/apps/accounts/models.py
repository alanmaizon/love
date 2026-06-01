"""
Membership linking a User to a Charity (the organization tenant) with a role.

Separates *content* power from *money* power:
  owner/admin -> manage profile + members + connect payouts
  finance     -> view payouts/reports only
  editor      -> edit profile/campaigns, no money
"""
from django.conf import settings
from django.db import models


class OrgMembership(models.Model):
    OWNER = "owner"
    ADMIN = "admin"
    FINANCE = "finance"
    EDITOR = "editor"
    ROLE_CHOICES = [
        (OWNER, "Owner"),
        (ADMIN, "Admin"),
        (FINANCE, "Finance"),
        (EDITOR, "Editor"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="org_memberships",
    )
    charity = models.ForeignKey(
        "donations.Charity",
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=EDITOR)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "charity")

    def __str__(self):
        return f"{self.user} @ {self.charity} ({self.role})"


class UserProfile(models.Model):
    """Email verification state for Phase 4 publish gates."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    email_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=64, blank=True, default="")
    token_created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "User profile"

    def __str__(self):
        return f"Profile({self.user.username}, verified={self.email_verified})"

    def issue_verification_token(self):
        import secrets
        from django.utils import timezone

        self.verification_token = secrets.token_urlsafe(32)
        self.token_created_at = timezone.now()
        self.email_verified = False
        self.save(update_fields=["verification_token", "token_created_at", "email_verified"])

    def clear_verification_token(self):
        self.verification_token = ""
        self.token_created_at = None
        self.email_verified = True
        self.save(
            update_fields=["verification_token", "token_created_at", "email_verified"]
        )
