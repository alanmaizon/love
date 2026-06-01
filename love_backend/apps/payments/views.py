"""
Payment HTTP endpoints:
  GET  /api/payments/config/     publishable key for the frontend
  POST /api/payments/checkout/   create a Checkout Session for a donation
  POST /api/payments/connect/    start charity Connect onboarding
  POST /api/payments/webhook/    Stripe webhook (see webhooks.py)
"""
import logging
import time
from decimal import Decimal, InvalidOperation

import stripe

from django.conf import settings
from django.db import OperationalError
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    renderer_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication

from accounts.models import OrgMembership
from accounts.permissions import MONEY_ROLES, charity_ids_for_user
from campaigns.models import Campaign
from core.security import request_origin_allowed
from donations.models import Charity, Donation
from donations.throttles import CheckoutRateThrottle
from . import services
from .webhooks import _handle_checkout_completed

logger = logging.getLogger(__name__)


def _resolve_campaign(value):
    """Resolve campaign by id or slug; never silently default to flagship."""
    if not value:
        return None
    if str(value).isdigit():
        c = Campaign.objects.filter(id=value).first()
        if c:
            return c
    return Campaign.objects.filter(slug=value).first()


@api_view(["GET"])
@renderer_classes([JSONRenderer])
@authentication_classes([])
@permission_classes([AllowAny])
def config(request):
    return Response({"publishable_key": settings.STRIPE_PUBLISHABLE_KEY})


@api_view(["POST"])
@renderer_classes([JSONRenderer])
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
@throttle_classes([CheckoutRateThrottle])
def create_checkout(request):
    """Create a Checkout Session for a *new* pending donation."""
    if not request_origin_allowed(request):
        return Response({"error": "Invalid request origin."}, status=403)

    data = request.data

    try:
        amount = Decimal(str(data.get("amount", ""))).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError, TypeError):
        return Response({"error": "A valid donation amount is required."}, status=400)
    if amount <= 0:
        return Response({"error": "Donation amount must be greater than zero."}, status=400)

    donor_email = (data.get("donor_email") or "").strip()
    if not donor_email:
        return Response({"error": "A valid donor email is required."}, status=400)
    try:
        validate_email(donor_email)
    except ValidationError:
        return Response({"error": "A valid donor email is required."}, status=400)

    charity = get_object_or_404(
        Charity.objects.filter(is_active=True, verification_status=Charity.VERIFIED),
        id=data.get("charity"),
    )
    campaign = _resolve_campaign(data.get("campaign"))
    if campaign is None:
        return Response({"error": "A valid campaign id or slug is required."}, status=400)
    if campaign.status != Campaign.ACTIVE or campaign.visibility not in (
        Campaign.PUBLIC, Campaign.UNLISTED,
    ):
        return Response({"error": "This campaign is not accepting donations."}, status=400)

    donation = Donation.objects.create(
        charity=charity,
        campaign=campaign,
        donor_name=data.get("donor_name", ""),
        donor_email=donor_email,
        amount=amount,
        message=data.get("message", ""),
        is_anonymous=bool(data.get("is_anonymous", False)),
        status="pending",
        user=request.user if request.user.is_authenticated else None,
    )

    try:
        url = services.create_checkout_session(donation)
    except ValueError as exc:
        donation.delete()
        return Response({"error": str(exc)}, status=400)
    except stripe.StripeError as exc:
        logger.exception("Stripe checkout failed for donation %s", donation.id)
        donation.delete()
        user_msg = getattr(exc, "user_message", None) or str(exc)
        return Response({"error": user_msg}, status=400)
    except RuntimeError as exc:
        logger.error("Stripe not configured: %s", exc)
        donation.delete()
        return Response({"error": "payments unavailable"}, status=503)
    return Response({"checkout_url": url, "donation_id": donation.id})


@api_view(["POST"])
@renderer_classes([JSONRenderer])
@authentication_classes([])
@permission_classes([AllowAny])
def sync_checkout_session(request):
    """
    Local dev fallback: confirm a donation from Stripe Checkout session_id when
    webhooks did not reach localhost (Dashboard payment ≠ CLI forward).
    Disabled outside DEBUG.
    """
    if not settings.DEBUG:
        return Response({"error": "not available"}, status=404)
    if not request_origin_allowed(request):
        return Response({"error": "Invalid request origin."}, status=403)

    session_id = (request.data.get("session_id") or "").strip()
    if not session_id.startswith("cs_"):
        return Response({"error": "A valid Stripe session_id (cs_...) is required."}, status=400)

    try:
        session = services._client().checkout.Session.retrieve(session_id)
    except stripe.StripeError as exc:
        logger.exception("Stripe session retrieve failed for %s", session_id)
        return Response({"error": str(exc)}, status=400)

    if hasattr(session, "to_dict"):
        session_data = session.to_dict()
    else:
        session_data = dict(session)

    donation_id = (session_data.get("metadata") or {}).get("donation_id")
    donation = Donation.objects.filter(id=donation_id).first() if donation_id else None
    if donation and donation.status == "confirmed":
        return Response({
            "donation_id": donation.id,
            "status": donation.status,
            "stripe_payment_intent_id": donation.stripe_payment_intent_id,
        })

    last_error = None
    for attempt in range(6):
        try:
            _handle_checkout_completed(session_data)
            last_error = None
            break
        except OperationalError as exc:
            last_error = exc
            if "locked" not in str(exc).lower():
                raise
            time.sleep(0.05 * (2 ** attempt))
            donation = Donation.objects.filter(id=donation_id).first() if donation_id else None
            if donation and donation.status == "confirmed":
                last_error = None
                break
        except Exception:
            logger.exception("sync_checkout_session failed for %s", session_id)
            return Response({"error": "Could not confirm donation from session."}, status=500)

    if last_error is not None:
        logger.exception("sync_checkout_session database locked for %s", session_id)
        return Response({"error": "Database busy; retry in a moment."}, status=503)

    donation = Donation.objects.filter(id=donation_id).first() if donation_id else None
    if donation is None:
        return Response({"error": "Donation not found for session."}, status=404)
    return Response({
        "donation_id": donation.id,
        "status": donation.status,
        "stripe_payment_intent_id": donation.stripe_payment_intent_id,
    })


@api_view(["POST"])
@renderer_classes([JSONRenderer])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def start_connect_onboarding(request):
    """Begin Stripe Connect onboarding for a charity owner/admin or platform staff."""
    charity = get_object_or_404(
        Charity.objects.filter(is_active=True),
        id=request.data.get("charity"),
    )
    is_member = OrgMembership.objects.filter(
        user=request.user, charity=charity,
        role__in=MONEY_ROLES,
    ).exists()
    if not (request.user.is_staff or is_member):
        return Response({"error": "You don't manage this charity."}, status=403)
    try:
        url = services.create_account_link(charity)
    except RuntimeError as exc:
        return Response({"error": str(exc)}, status=503)
    return Response({"onboarding_url": url})
