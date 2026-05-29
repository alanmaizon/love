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
    # Charity lives in the donations app (its tenant + table predate this split).
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
