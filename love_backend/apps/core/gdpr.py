"""GDPR export and erasure helpers (staff commands)."""
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

User = get_user_model()


def export_user_data(user) -> dict:
    from accounts.models import OrgMembership, UserProfile
    from campaigns.models import Campaign
    from donations.models import Donation
    profile = UserProfile.objects.filter(user=user).first()
    return {
        "exported_at": timezone.now().isoformat(),
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "date_joined": user.date_joined.isoformat() if user.date_joined else None,
            "is_staff": user.is_staff,
        },
        "profile": {
            "email_verified": profile.email_verified if profile else None,
        },
        "org_memberships": list(
            OrgMembership.objects.filter(user=user).values(
                "charity_id", "role", "created_at"
            )
        ),
        "campaigns_owned": list(
            Campaign.objects.filter(owner=user).values(
                "id", "slug", "title", "status", "created_at"
            )
        ),
        "donations_linked": list(
            Donation.objects.filter(user=user).values(
                "id", "amount", "status", "created_at", "charity_id", "campaign_id"
            )
        ),
        "donations_by_email": list(
            Donation.objects.filter(donor_email__iexact=user.email).values(
                "id", "donor_name", "amount", "status", "created_at"
            )
        ) if user.email else [],
    }


@transaction.atomic
def erase_user_data(user, *, anonymize_donations: bool = True) -> dict:
    """
    Deactivate user-owned content and anonymize PII. Does not delete financial
    ledger rows (legal retention); scrubs donor PII where linked.
    """
    from accounts.models import OrgMembership
    from campaigns.models import Campaign
    from donations.models import Donation
    summary = {"username": user.username, "user_id": user.id}

    Campaign.objects.filter(owner=user).update(status=Campaign.DRAFT)
    summary["campaigns_drafted"] = Campaign.objects.filter(owner=user).count()

    if anonymize_donations and user.email:
        n = Donation.objects.filter(donor_email__iexact=user.email).update(
            donor_name="[erased]",
            donor_email=f"erased-{user.id}@invalid.local",
            message="",
        )
        summary["donations_anonymized_by_email"] = n

    Donation.objects.filter(user=user).update(user=None)
    OrgMembership.objects.filter(user=user).delete()

    user.is_active = False
    user.email = f"erased-{user.id}@invalid.local"
    user.first_name = ""
    user.username = f"erased_{user.id}"
    user.set_unusable_password()
    user.save(
        update_fields=["is_active", "email", "first_name", "username", "password"]
    )
    summary["user_deactivated"] = True
    return summary
