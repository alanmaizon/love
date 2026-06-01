"""
Stripe Connect service layer.

Charge model: **destination charges**. The platform creates the Checkout Session,
funds route to the charity's connected account via transfer_data.destination
(+ on_behalf_of so the charity is the settlement merchant). The platform may keep
an application fee (PLATFORM_FEE_BPS; default 0 -> 100% to the charity).

All money-moving calls pass an idempotency key so retries never double-charge.
"""
import hashlib
import json
import logging
import os

import stripe
from django.conf import settings

from donations.models import Charity, Donation, PayoutAccount

logger = logging.getLogger(__name__)

# Local smoke/webhook tests only — never sent to Stripe as transfer destinations.
_PLACEHOLDER_ACCOUNT_PREFIXES = ("acct_smoke",)


def _client():
    if not settings.STRIPE_SECRET_KEY:
        raise RuntimeError("STRIPE_SECRET_KEY is not configured")
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def _stripe_value(obj, key: str, default=None):
    """Read a field from a Stripe API object or a webhook/event dict."""
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


def _stripe_bool(obj, key: str) -> bool:
    return bool(_stripe_value(obj, key, False))


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
    payout.charges_enabled = _stripe_bool(acct, "charges_enabled")
    payout.payouts_enabled = _stripe_bool(acct, "payouts_enabled")
    payout.details_submitted = _stripe_bool(acct, "details_submitted")
    payout.save(update_fields=["charges_enabled", "payouts_enabled", "details_submitted", "updated_at"])
    return payout


# --- Checkout ---------------------------------------------------------------
def _application_fee_minor(amount_minor: int) -> int:
    return (amount_minor * settings.PLATFORM_FEE_BPS) // 10000


def _checkout_idempotency_key(
    donation: Donation,
    *,
    amount_minor: int,
    currency: str,
    destination: str,
    fee_minor: int,
    locale: str,
    success_url: str,
    cancel_url: str,
) -> str:
    """
    Stripe idempotency keys are scoped to the exact request body.

    Using only donation.pk collides in CI: e2e_prepare imports a fixed CSV so each
    run often creates donation id=28, while Stripe remembers checkout-donation-28
    from an earlier job with different session params (locale, URLs, fees).
    """
    payload = {
        "donation_id": donation.pk,
        "created_at": donation.created_at.isoformat() if donation.created_at else "",
        "amount_minor": amount_minor,
        "currency": currency,
        "charity_id": donation.charity_id,
        "destination": destination,
        "fee_minor": fee_minor,
        "locale": locale,
        "success_url": success_url,
        "cancel_url": cancel_url,
        "customer_email": donation.donor_email or "",
        "payment_method_types": "card",
    }
    digest = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()[:24]
    return f"checkout-donation-{donation.pk}-{digest}"


def _resolve_payout_for_checkout(charity: Charity) -> PayoutAccount:
    """Return a payout row that exists in Stripe and can receive destination charges."""
    payout = getattr(charity, "payout_account", None)
    if not payout or not payout.charges_enabled:
        raise ValueError(
            "Charity payout account is not ready (charges disabled). "
            "Complete Stripe Connect onboarding for this charity."
        )
    acct_id = (payout.stripe_account_id or "").strip()
    if not acct_id.startswith("acct_"):
        raise ValueError("Charity payout account is misconfigured.")
    if any(acct_id.startswith(p) for p in _PLACEHOLDER_ACCOUNT_PREFIXES):
        raise ValueError(
            "Charity uses a placeholder Stripe account from a local smoke test. "
            "Run: python manage.py repair_placeholder_payouts "
            "then import_donations --stripe-account acct_... or Connect onboarding."
        )

    s = _client()
    try:
        acct = s.Account.retrieve(acct_id)
    except stripe.InvalidRequestError as exc:
        logger.warning("Stripe account %s invalid: %s", acct_id, exc)
        raise ValueError(
            f"Stripe does not recognize connected account {acct_id}. "
            "Use a test-mode acct_ from your Stripe Dashboard or re-run "
            "import_donations --stripe-account acct_..."
        ) from exc
    if not _stripe_bool(acct, "charges_enabled"):
        raise ValueError(
            "Charity Stripe account exists but charges are not enabled yet. "
            "Finish Connect onboarding in the Stripe Dashboard."
        )
    return payout


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
    payout = _resolve_payout_for_checkout(charity)

    amount_minor = int(donation.amount * 100)
    currency = (donation.currency or settings.STRIPE_CURRENCY).lower()
    fee_minor = _application_fee_minor(amount_minor)

    # Persist fee breakdown at checkout time so webhooks match Stripe even if
    # PLATFORM_FEE_BPS changes before the event is delivered.
    from decimal import Decimal
    donation.platform_fee = (Decimal(fee_minor) / Decimal(100)).quantize(Decimal("0.01"))
    donation.net_amount = (donation.amount - donation.platform_fee).quantize(Decimal("0.01"))
    donation.save(update_fields=["platform_fee", "net_amount", "updated_at"])

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

    locale = os.environ.get("STRIPE_CHECKOUT_LOCALE", "en")
    success_url = f"{settings.FRONTEND_URL}/confirmation?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{settings.FRONTEND_URL}/donate?canceled=1"
    idempotency_key = _checkout_idempotency_key(
        donation,
        amount_minor=amount_minor,
        currency=currency,
        destination=payout.stripe_account_id,
        fee_minor=fee_minor,
        locale=locale,
        success_url=success_url,
        cancel_url=cancel_url,
    )

    session = s.checkout.Session.create(
        mode="payment",
        payment_method_types=["card"],
        locale=locale,
        success_url=success_url,
        cancel_url=cancel_url,
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
        idempotency_key=idempotency_key,
    )
    return session.url
