"""
Stripe webhook receiver — signature-verified and idempotent.

On checkout.session.completed for a donation:
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
from donations.models import Donation, LedgerEntry
from .models import WebhookEvent

logger = logging.getLogger(__name__)


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
    except (ValueError, stripe.error.SignatureVerificationError):
        logger.warning("Invalid Stripe webhook signature")
        return Response({"error": "invalid signature"}, status=400)

    # Dedupe by Stripe event id (exactly-once processing).
    wh, created = WebhookEvent.objects.get_or_create(
        stripe_event_id=event["id"],
        defaults={"event_type": event["type"], "payload": event.to_dict()},
    )
    if not created and wh.status == WebhookEvent.PROCESSED:
        return Response({"status": "already processed"}, status=200)

    handler = {
        "checkout.session.completed": _handle_checkout_completed,
        "account.updated": _handle_account_updated,
    }.get(event["type"])

    if handler is None:
        wh.status = WebhookEvent.IGNORED
        wh.processed_at = timezone.now()
        wh.save(update_fields=["status", "processed_at"])
        return Response({"status": "ignored"}, status=200)

    try:
        handler(event["data"]["object"])
        wh.status = WebhookEvent.PROCESSED
        wh.processed_at = timezone.now()
        wh.save(update_fields=["status", "processed_at"])
    except Exception as exc:  # noqa: BLE001
        logger.exception("Webhook handler failed")
        wh.status = WebhookEvent.FAILED
        wh.error = str(exc)
        wh.save(update_fields=["status", "error"])
        return Response({"error": "handler failed"}, status=500)  # Stripe retries

    return Response({"status": "ok"}, status=status.HTTP_200_OK)


@transaction.atomic
def _handle_checkout_completed(session):
    donation_id = (session.get("metadata") or {}).get("donation_id")
    if not donation_id:
        return
    donation = Donation.objects.select_for_update().filter(id=donation_id).first()
    if donation is None:
        logger.warning("Webhook for unknown donation_id=%s", donation_id)
        return
    if donation.status == "confirmed":
        return  # already settled

    amount = donation.amount
    currency = (session.get("currency") or donation.currency or "eur").upper()

    pi = session.get("payment_intent")
    donation.stripe_payment_intent_id = pi if isinstance(pi, str) else (pi or {}).get("id")
    platform_fee = (Decimal(amount) * settings.PLATFORM_FEE_BPS) / Decimal(10000)
    donation.platform_fee = platform_fee.quantize(Decimal("0.01"))
    donation.net_amount = (Decimal(amount) - donation.platform_fee).quantize(Decimal("0.01"))
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


def _handle_account_updated(account):
    from donations.models import PayoutAccount
    payout = PayoutAccount.objects.filter(stripe_account_id=account.get("id")).first()
    if payout is None:
        return
    payout.charges_enabled = bool(account.get("charges_enabled"))
    payout.payouts_enabled = bool(account.get("payouts_enabled"))
    payout.details_submitted = bool(account.get("details_submitted"))
    payout.save(update_fields=["charges_enabled", "payouts_enabled", "details_submitted", "updated_at"])
