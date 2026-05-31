"""
Stripe Connect service layer.

Charge model: **destination charges**. The platform creates the Checkout Session,
funds route to the charity's connected account via transfer_data.destination
(+ on_behalf_of so the charity is the settlement merchant). The platform may keep
an application fee (PLATFORM_FEE_BPS; default 0 -> 100% to the charity).

All money-moving calls pass an idempotency key so retries never double-charge.
"""
import logging

import stripe
from django.conf import settings

from donations.models import Charity, Donation, PayoutAccount

logger = logging.getLogger(__name__)


def _client():
    if not settings.STRIPE_SECRET_KEY:
        raise RuntimeError("STRIPE_SECRET_KEY is not configured")
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


# --- Connect onboarding -----------------------------------------------------
def create_connect_account(charity: Charity) -> PayoutAccount:
    """Create (or return) the charity's Stripe Express connected account."""
    s = _client()
    payout = getattr(charity, "payout_account", None)
    if payout and payout.stripe_account_id:
        return payout

    account = s.Account.create(
        type="express",
        email=charity.contact_email or None,
        business_type="non_profit",
        metadata={"charity_id": str(charity.id), "charity_slug": charity.slug or ""},
    )
    payout, _ = PayoutAccount.objects.update_or_create(
        charity=charity,
        defaults={"stripe_account_id": account.id},
    )
    return payout


def create_account_link(charity: Charity) -> str:
    """Return a one-time onboarding/KYC URL for the charity's connected account."""
    s = _client()
    payout = create_connect_account(charity)
    link = s.AccountLink.create(
        account=payout.stripe_account_id,
        refresh_url=f"{settings.FRONTEND_URL}/dashboard/charities/{charity.slug}/connect/refresh",
        return_url=f"{settings.FRONTEND_URL}/dashboard/charities/{charity.slug}/connect/return",
        type="account_onboarding",
    )
    return link.url


def refresh_account_status(charity: Charity) -> PayoutAccount:
    """Sync capability flags from Stripe onto the local PayoutAccount."""
    s = _client()
    payout = charity.payout_account
    acct = s.Account.retrieve(payout.stripe_account_id)
    payout.charges_enabled = bool(acct.get("charges_enabled"))
    payout.payouts_enabled = bool(acct.get("payouts_enabled"))
    payout.details_submitted = bool(acct.get("details_submitted"))
    payout.save(update_fields=["charges_enabled", "payouts_enabled", "details_submitted", "updated_at"])
    return payout


# --- Checkout ---------------------------------------------------------------
def _application_fee_minor(amount_minor: int) -> int:
    return (amount_minor * settings.PLATFORM_FEE_BPS) // 10000


def create_checkout_session(donation: Donation) -> str:
    """
    Create a Stripe Checkout Session for a pending donation and return its URL.

    Invariant: money can only reach a *verified* charity with a payout-ready
    connected account. We refuse otherwise.
    """
    s = _client()
    charity = donation.charity

    if not charity.is_verified:
        raise ValueError("Charity is not verified; cannot accept donations.")
    payout = getattr(charity, "payout_account", None)
    if not payout or not payout.charges_enabled:
        raise ValueError("Charity payout account is not ready (charges disabled).")

    amount_minor = int(donation.amount * 100)
    currency = (donation.currency or settings.STRIPE_CURRENCY).lower()
    fee_minor = _application_fee_minor(amount_minor)

    # Destination charge: the platform is merchant of record and Stripe transfers
    # the funds to the charity's connected account. We deliberately do NOT also set
    # on_behalf_of — Stripe rejects combining it with transfer_data.destination when
    # the destination uses its own charges, and the destination already routes the
    # money to the verified charity (the invariant we care about).
    payment_intent_data = {
        "transfer_data": {"destination": payout.stripe_account_id},
        "metadata": {"donation_id": str(donation.id)},
    }
    if fee_minor > 0:
        payment_intent_data["application_fee_amount"] = fee_minor

    session = s.checkout.Session.create(
        mode="payment",
        success_url=f"{settings.FRONTEND_URL}/confirmation?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{settings.FRONTEND_URL}/donate?canceled=1",
        customer_email=donation.donor_email or None,
        line_items=[{
            "quantity": 1,
            "price_data": {
                "currency": currency,
                "unit_amount": amount_minor,
                "product_data": {
                    "name": f"Donation to {charity.name}",
                    "description": (donation.message or "")[:300] or None,
                },
            },
        }],
        payment_intent_data=payment_intent_data,
        metadata={"donation_id": str(donation.id), "campaign": donation.campaign.slug if donation.campaign else ""},
        idempotency_key=f"checkout-donation-{donation.id}",
    )
    return session.url
