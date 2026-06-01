"""Helpers to attach Stripe Connect account ids to charities (local dev + import)."""
from donations.models import Charity, PayoutAccount


def wire_stripe_account_to_charities(stripe_account_id, charities=None):
    """
    Create or update a PayoutAccount per charity pointing at the same acct_ id.
    Safe for local test mode where one Connect account stands in for all three
    launch charities.
    """
    acct = (stripe_account_id or "").strip()
    if not acct.startswith("acct_"):
        raise ValueError("Expected a Stripe Connect account id (acct_...).")

    if charities is None:
        charities = Charity.objects.filter(
            is_active=True, verification_status=Charity.VERIFIED,
        )

    wired = []
    for charity in charities:
        payout, created = PayoutAccount.objects.update_or_create(
            charity=charity,
            defaults={
                "stripe_account_id": acct,
                "charges_enabled": True,
                "payouts_enabled": True,
                "details_submitted": True,
            },
        )
        wired.append((charity.name, created, payout.stripe_account_id))
    return wired
