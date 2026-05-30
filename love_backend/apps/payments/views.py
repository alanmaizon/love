"""
Payment HTTP endpoints:
  GET  /api/payments/config/     publishable key for the frontend
  POST /api/payments/checkout/   create a Checkout Session for a donation
  POST /api/payments/connect/    (admin) start charity Connect onboarding
  POST /api/payments/webhook/    Stripe webhook (see webhooks.py)
"""
import logging

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    renderer_classes,
)
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from campaigns.models import Campaign
from donations.models import Charity, Donation
from donations.utils import CsrfExemptSessionAuthentication
from . import services

logger = logging.getLogger(__name__)


def _resolve_campaign(value):
    """Resolve a campaign by id or slug; fall back to the flagship (first active
    public campaign) so the public donate form needn't know campaign ids."""
    if value:
        c = Campaign.objects.filter(id=value).first() if str(value).isdigit() else None
        c = c or Campaign.objects.filter(slug=value).first()
        if c:
            return c
    return Campaign.objects.filter(
        visibility=Campaign.PUBLIC, status=Campaign.ACTIVE
    ).order_by("id").first()


@api_view(["GET"])
@renderer_classes([JSONRenderer])
@authentication_classes([])
@permission_classes([AllowAny])
def config(request):
    return Response({"publishable_key": settings.STRIPE_PUBLISHABLE_KEY})


@api_view(["POST"])
@renderer_classes([JSONRenderer])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def create_checkout(request):
    """Create a Checkout Session for a donation (existing id, or create pending)."""
    data = request.data
    donation_id = data.get("donation_id")
    if donation_id:
        donation = get_object_or_404(Donation, id=donation_id)
    else:
        charity = get_object_or_404(Charity, id=data.get("charity"))
        campaign = _resolve_campaign(data.get("campaign"))
        donation = Donation.objects.create(
            charity=charity,
            campaign=campaign,
            donor_name=data.get("donor_name", ""),
            donor_email=data.get("donor_email", ""),
            amount=data.get("amount") or 0,
            message=data.get("message", ""),
            is_anonymous=bool(data.get("is_anonymous", False)),
            status="pending",
            user=request.user if request.user.is_authenticated else None,
        )

    try:
        url = services.create_checkout_session(donation)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)
    except RuntimeError as exc:
        logger.error("Stripe not configured: %s", exc)
        return Response({"error": "payments unavailable"}, status=503)
    return Response({"checkout_url": url, "donation_id": donation.id})


@api_view(["POST"])
@renderer_classes([JSONRenderer])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAdminUser])
def start_connect_onboarding(request):
    """Admin-only: begin Stripe Connect onboarding for a charity."""
    charity = get_object_or_404(Charity, id=request.data.get("charity"))
    try:
        url = services.create_account_link(charity)
    except RuntimeError as exc:
        return Response({"error": str(exc)}, status=503)
    return Response({"onboarding_url": url})
