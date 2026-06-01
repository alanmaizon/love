"""
Stripe webhook receiver — signature-verified and idempotent.

On checkout.session.completed (payment_status=paid) or payment_intent.succeeded:
  - mark the Donation confirmed, store the PaymentIntent id + fee breakdown
  - write the append-only LedgerEntry set
  - enqueue an OutboxEvent so the receipt + thank-you email are sent reliably
All in one DB transaction; deduped by Stripe event id.
"""
import logging
from decimal import Decimal

import stripe
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    renderer_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from core.models import OutboxEvent
from core.security import sanitize_stripe_event_payload
from donations.models import Donation, LedgerEntry
from . import services
from .models import WebhookEvent
from .services import _stripe_value

logger = logging.getLogger(__name__)


def _stripe_client():
    if not settings.STRIPE_SECRET_KEY:
        return None
    stripe.api_key = settings.STRIPE_SECRET_KEY
    return stripe


def _platform_fee_from_stripe(payment_intent_id):
    """Read application_fee_amount from Stripe (minor units) — source of truth."""
    s = _stripe_client()
    if not s or not payment_intent_id:
        return None
    try:
        pi = s.PaymentIntent.retrieve(payment_intent_id)
        charge_id = _stripe_value(pi, "latest_charge")
        if not charge_id:
            return None
        charge = s.Charge.retrieve(charge_id)
        fee_minor = _stripe_value(charge, "application_fee_amount") or 0
        return (Decimal(fee_minor) / Decimal(100)).quantize(Decimal("0.01"))
    except Exception:
        logger.exception("Failed to read application fee from Stripe pi=%s", payment_intent_id)
        return None


def _confirm_donation(donation, session_or_pi, currency=None):
    """Mark donation confirmed and write ledger + outbox (idempotent)."""
    if donation.status == "confirmed":
        return

    if not isinstance(session_or_pi, str):
        pi = _stripe_value(session_or_pi, "payment_intent")
        payment_intent_id = pi if isinstance(pi, str) else _stripe_value(pi, "id")
        currency = (_stripe_value(session_or_pi, "currency") or donation.currency or "eur").upper()
    else:
        payment_intent_id = session_or_pi
        currency = (currency or donation.currency or "eur").upper()

    donation.stripe_payment_intent_id = payment_intent_id

    fee = _platform_fee_from_stripe(payment_intent_id)
    if fee is None and donation.platform_fee is not None:
        fee = donation.platform_fee
    if fee is None:
        fee = (Decimal(donation.amount) * settings.PLATFORM_FEE_BPS) / Decimal(10000)
        fee = fee.quantize(Decimal("0.01"))

    donation.platform_fee = fee
    donation.net_amount = (Decimal(donation.amount) - donation.platform_fee).quantize(Decimal("0.01"))
    donation.status = "confirmed"
    donation.save(update_fields=[
        "status", "stripe_payment_intent_id", "platform_fee", "net_amount", "updated_at",
    ])

    LedgerEntry.objects.create(
        donation=donation, entry_type=LedgerEntry.DONATION_RECEIVED,
        account=LedgerEntry.CHARITY, amount=donation.net_amount, currency=currency,
    )
    if donation.platform_fee > 0:
        LedgerEntry.objects.create(
            donation=donation, entry_type=LedgerEntry.PLATFORM_FEE,
            account=LedgerEntry.PLATFORM, amount=donation.platform_fee, currency=currency,
        )

    OutboxEvent.objects.create(
        event_type="donation.confirmed",
        payload={"donation_id": donation.id},
    )


@csrf_exempt
@api_view(["POST"])
@renderer_classes([JSONRenderer])
@authentication_classes([])
@permission_classes([AllowAny])
def stripe_webhook(request):
    payload = request.body
    sig = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    secret = settings.STRIPE_WEBHOOK_SECRET
    if not secret:
        logger.error("STRIPE_WEBHOOK_SECRET not configured")
        return Response({"error": "webhook not configured"}, status=500)

    try:
        event = stripe.Webhook.construct_event(payload, sig, secret)
    except (ValueError, stripe.SignatureVerificationError):
        logger.warning(
            "Invalid Stripe webhook signature — if using Stripe CLI, copy the "
            "whsec_ from `stripe listen` into STRIPE_WEBHOOK_SECRET and restart runserver"
        )
        return Response({"error": "invalid signature"}, status=400)

    sanitized = sanitize_stripe_event_payload(event.to_dict())

    wh, created = WebhookEvent.objects.get_or_create(
        stripe_event_id=event["id"],
        defaults={"event_type": event["type"], "payload": sanitized},
    )
    if not created:
        wh.payload = sanitized
        wh.event_type = event["type"]
    if not created and wh.status == WebhookEvent.PROCESSED:
        wh.save(update_fields=["payload", "event_type"])
        return Response({"status": "already processed"}, status=200)

    handler = {
        "checkout.session.completed": _handle_checkout_completed,
        "payment_intent.succeeded": _handle_payment_intent_succeeded,
        "account.updated": _handle_account_updated,
    }.get(event["type"])

    if handler is None:
        wh.status = WebhookEvent.IGNORED
        wh.processed_at = timezone.now()
        wh.save(update_fields=["status", "processed_at", "payload", "event_type"])
        return Response({"status": "ignored"}, status=200)

    try:
        handler(event["data"]["object"])
        wh.status = WebhookEvent.PROCESSED
        wh.processed_at = timezone.now()
        wh.save(update_fields=["status", "processed_at", "payload", "event_type", "error"])
        logger.info("Stripe webhook processed: %s %s", event["type"], event["id"])
    except Exception as exc:  # noqa: BLE001
        logger.exception("Webhook handler failed")
        wh.status = WebhookEvent.FAILED
        wh.error = str(exc)
        wh.save(update_fields=["status", "error", "payload", "event_type"])
        return Response({"error": "handler failed"}, status=500)

    return Response({"status": "ok"}, status=status.HTTP_200_OK)


@transaction.atomic
def _handle_checkout_completed(session):
    donation_id = _stripe_value(_stripe_value(session, "metadata"), "donation_id")
    if not donation_id:
        logger.warning("checkout.session.completed missing metadata.donation_id")
        return

    payment_status = _stripe_value(session, "payment_status")
    if payment_status == "unpaid":
        logger.info("checkout.session.completed unpaid — waiting for payment_intent.succeeded")
        return
    if payment_status == "no_payment_required":
        return
    if payment_status not in (None, "paid"):
        logger.warning("Unexpected payment_status=%s for donation_id=%s", payment_status, donation_id)
        return

    donation = Donation.objects.select_for_update().filter(id=donation_id).first()
    if donation is None:
        logger.warning("Webhook for unknown donation_id=%s", donation_id)
        return
    _confirm_donation(donation, session)


@transaction.atomic
def _handle_payment_intent_succeeded(payment_intent):
    donation_id = _stripe_value(_stripe_value(payment_intent, "metadata"), "donation_id")
    if not donation_id:
        return
    donation = Donation.objects.select_for_update().filter(id=donation_id).first()
    if donation is None:
        return
    currency = (_stripe_value(payment_intent, "currency") or donation.currency or "eur").upper()
    _confirm_donation(donation, _stripe_value(payment_intent, "id"), currency=currency)


def _handle_account_updated(account):
    from donations.models import PayoutAccount
    payouts = PayoutAccount.objects.filter(stripe_account_id=account.get("id"))
    if not payouts.exists():
        return
    fields = {
        "charges_enabled": bool(account.get("charges_enabled")),
        "payouts_enabled": bool(account.get("payouts_enabled")),
        "details_submitted": bool(account.get("details_submitted")),
    }
    payouts.update(**fields)
