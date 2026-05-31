"""
Payment HTTP endpoints:
  GET  /api/payments/config/     publishable key for the frontend
  POST /api/payments/checkout/   create a Checkout Session for a donation
  POST /api/payments/connect/    (admin) start charity Connect onboarding
  POST /api/payments/webhook/    Stripe webhook (see webhooks.py)
"""
import logging
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    renderer_classes,
)
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from accounts.models import OrgMembership
from campaigns.models import Campaign
from donations.models import Charity, Donation
from donations.utils import CsrfExemptSessionAuthentication
from messaging.models import Message
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
    """Create a Checkout Session for a *new* pending donation.

    We deliberately do NOT accept a caller-supplied donation id. Donation ids are
    sequential and a Checkout Session prefills the donor's email on the Stripe-
    hosted page, so honouring an arbitrary id would let anyone mint a session for
    someone else's donation and read that donor's email (IDOR -> PII leak, which
    would defeat the donor_email redaction the serializers enforce). Each call
    creates a fresh donation owned by the caller (or anonymous).
    """
    data = request.data

    # Amount is validated here because this endpoint creates the Donation
    # directly, bypassing DonationSerializer.validate_amount.
    try:
        amount = Decimal(str(data.get("amount", ""))).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError, TypeError):
        return Response({"error": "A valid donation amount is required."}, status=400)
    if amount <= 0:
        return Response({"error": "Donation amount must be greater than zero."}, status=400)

    charity = get_object_or_404(Charity, id=data.get("charity"))
    campaign = _resolve_campaign(data.get("campaign"))
    donation = Donation.objects.create(
        charity=charity,
        campaign=campaign,
        donor_name=data.get("donor_name", ""),
        donor_email=data.get("donor_email", ""),
        amount=amount,
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
@permission_classes([IsAuthenticated])
def start_connect_onboarding(request):
    """Begin Stripe Connect onboarding for a charity. Allowed for the charity's
    owner/admin (via OrgMembership) or platform staff — not any logged-in user."""
    charity = get_object_or_404(Charity, id=request.data.get("charity"))
    is_member = OrgMembership.objects.filter(
        user=request.user, charity=charity,
        role__in=[OrgMembership.OWNER, OrgMembership.ADMIN],
    ).exists()
    if not (request.user.is_staff or is_member):
        return Response({"error": "You don't manage this charity."}, status=403)
    try:
        url = services.create_account_link(charity)
    except RuntimeError as exc:
        return Response({"error": str(exc)}, status=503)
    return Response({"onboarding_url": url})
