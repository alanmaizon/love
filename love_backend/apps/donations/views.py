import json
import logging
import os
from datetime import timedelta

import requests
from django.contrib.auth import authenticate, login, logout
from django.core.cache import cache
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from django.views.decorators.csrf import csrf_exempt
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from rest_framework import status as drf_status
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.permissions import (
    AllowAny,
    IsAdminUser,
    IsAuthenticated,
    IsAuthenticatedOrReadOnly,
    SAFE_METHODS,
)
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import OrgMembership
from campaigns.models import Campaign, CampaignBeneficiary
from core.models import AuditLog
from messaging.models import Message

from .helpers import send_donation_confirmation_email
from .mixins import CsrfExemptMixin
from .models import Charity, Donation
from .serializers import (
    CampaignSerializer,
    CampaignWriteSerializer,
    CharitySerializer,
    DonationSerializer,
    MessageSerializer,
)
from .utils import CsrfExemptSessionAuthentication

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public campaign + guestbook + analytics
# ---------------------------------------------------------------------------
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def public_campaign(request, slug=None):
    """
    Public campaign page. With a slug -> that campaign; without -> the flagship
    (first active public campaign). Replaces the old single-Profile public view.
    """
    qs = Campaign.objects.filter(visibility=Campaign.PUBLIC)
    campaign = qs.filter(slug=slug).first() if slug else qs.filter(status=Campaign.ACTIVE).first()
    if campaign is None:
        return Response({"error": "Campaign not found"}, status=404)
    return Response(CampaignSerializer(campaign, context={"request": request}).data)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def campaign_messages(request):
    """Approved guestbook messages, optionally filtered by ?campaign=<slug>."""
    qs = Message.objects.filter(moderation_status__in=Message.PUBLIC_STATES)
    slug = request.GET.get("campaign")
    if slug:
        qs = qs.filter(campaign__slug=slug)
    return Response(MessageSerializer(qs, many=True, context={"request": request}).data)


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def donation_analytics(request):
    """
    Confirmed-donation totals. v2: 100% to charity (no 50/50 couple split).
    Optional ?campaign=<slug> scopes the figures to one campaign.
    """
    qs = Donation.objects.filter(status="confirmed")
    slug = request.GET.get("campaign")
    if slug:
        qs = qs.filter(campaign__slug=slug)

    total_amount = qs.aggregate(total=Sum("amount"))["total"] or 0
    count_per_charity = list(
        qs.values("charity__name").annotate(
            count=Count("id"),
            total_allocated=Sum("amount"),  # full amount; no multiplier
        )
    )
    return Response({
        "total_amount": total_amount,
        "charity_amount": total_amount,  # 100% to charity
        "donations_count": qs.count(),
        "count_per_charity": count_per_charity,
    })


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def donation_stats(request):
    """
    JSON stats for client-side charts (replaces the server-side matplotlib PNG).
    Returns a 30-day daily trend + per-charity breakdown. Optional ?campaign=.
    """
    qs = Donation.objects.filter(status="confirmed")
    slug = request.GET.get("campaign")
    if slug:
        qs = qs.filter(campaign__slug=slug)

    today = timezone.now().date()
    start = today - timedelta(days=29)
    daily = {
        row["day"]: row["total"]
        for row in qs.filter(created_at__date__gte=start)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(total=Sum("amount"))
    }
    trend = [
        {"date": (start + timedelta(days=i)).isoformat(),
         "total": float(daily.get(start + timedelta(days=i), 0) or 0)}
        for i in range(30)
    ]
    by_charity = [
        {"charity": r["charity__name"], "total": float(r["total"] or 0), "count": r["count"]}
        for r in qs.values("charity__name").annotate(total=Sum("amount"), count=Count("id"))
    ]
    return Response({"trend": trend, "by_charity": by_charity})


# ---------------------------------------------------------------------------
# Auth (session)
# ---------------------------------------------------------------------------
@api_view(["GET"])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def me(request):
    """Lightweight identity for the frontend AuthContext (no Profile/PII).

    Also lists the charities the user can act for (via OrgMembership) with role +
    payout flags, so the UI knows whether to show charity tools.
    """
    u = request.user
    if not u.is_authenticated:
        return Response({"authenticated": False})

    charities = []
    for m in u.org_memberships.select_related("charity", "charity__payout_account"):
        c = m.charity
        payout = getattr(c, "payout_account", None)
        charities.append({
            "id": c.id, "slug": c.slug, "name": c.name, "role": m.role,
            "verification_status": c.verification_status,
            "is_verified": c.is_verified,
            "charges_enabled": bool(payout and payout.charges_enabled),
        })

    return Response({
        "authenticated": True,
        "username": u.username,
        "display_name": (u.get_full_name() or u.first_name or u.username),
        "isAdmin": u.is_staff,
        "charities": charities,
    })


@csrf_exempt
def login_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)
    user = authenticate(request, username=data.get("username"), password=data.get("password"))
    if user is not None:
        login(request, user)
        return JsonResponse({"message": "Login successful"}, status=200)
    return JsonResponse({"error": "Invalid credentials"}, status=400)


@csrf_exempt
def logout_view(request):
    if request.method == "POST":
        logout(request)
        return JsonResponse({"message": "Logged out successfully"}, status=200)
    return JsonResponse({"error": "Method not allowed"}, status=405)


# ---------------------------------------------------------------------------
# ViewSets
# ---------------------------------------------------------------------------
class DonationViewSet(CsrfExemptMixin, viewsets.ModelViewSet):
    queryset = Donation.objects.all().order_by("-created_at")
    serializer_class = DonationSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_permissions(self):
        # Public may create (donate) and read; mutating state is admin-only.
        if self.request.method in ("GET", "POST", "OPTIONS", "HEAD"):
            return [AllowAny()]
        return [IsAdminUser()]

    @action(detail=True, methods=["patch"], permission_classes=[IsAdminUser])
    def confirm(self, request, pk=None):
        donation = self.get_object()
        donation.status = "confirmed"
        donation.save(update_fields=["status", "updated_at"])
        try:
            send_donation_confirmation_email(donation)
        except Exception:
            logger.exception("Donation confirmation email failed")
        return Response(self.get_serializer(donation).data, status=drf_status.HTTP_200_OK)

    @action(detail=True, methods=["patch"], permission_classes=[IsAdminUser])
    def fail(self, request, pk=None):
        donation = self.get_object()
        donation.status = "failed"
        donation.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(donation).data, status=drf_status.HTTP_200_OK)


class CharityViewSet(CsrfExemptMixin, viewsets.ModelViewSet):
    """Public discovery (verified only) + self-serve charity registration.

    - list/retrieve: anonymous sees verified charities; a signed-in user also sees
      their own member charities (any status) so they can manage a pending one.
    - create: any authenticated user registers a charity and becomes its OWNER
      (OrgMembership); it starts unverified until a platform admin verifies it.
    - update/destroy: scoped to the user's member charities (or staff).
    """

    serializer_class = CharitySerializer
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [IsAuthenticated()]

    def _member_charity_ids(self, user):
        return OrgMembership.objects.filter(user=user).values_list("charity_id", flat=True)

    def get_queryset(self):
        user = self.request.user
        base = Charity.objects.filter(is_active=True)
        if self.action in ("update", "partial_update", "destroy"):
            if user.is_authenticated and user.is_staff:
                return base
            if user.is_authenticated:
                return base.filter(id__in=self._member_charity_ids(user))
            return base.none()
        if user.is_authenticated and user.is_staff:
            return base
        if user.is_authenticated:
            return base.filter(
                Q(verification_status=Charity.VERIFIED) | Q(id__in=self._member_charity_ids(user))
            ).distinct()
        return base.filter(verification_status=Charity.VERIFIED)

    def perform_create(self, serializer):
        name = serializer.validated_data.get("name", "")
        base = slugify(name) or "charity"
        slug, n = base, 2
        while Charity.objects.filter(slug=slug).exists():
            slug = f"{base}-{n}"
            n += 1
        charity = serializer.save(verification_status=Charity.UNVERIFIED, slug=slug)
        OrgMembership.objects.get_or_create(
            user=self.request.user, charity=charity,
            defaults={"role": OrgMembership.OWNER},
        )
        AuditLog.objects.create(
            actor=self.request.user, action="charity.register",
            target_type="charity", target_id=str(charity.id),
            metadata={"name": charity.name},
        )

    # --- Platform-admin verification queue (staff only) ---
    @action(detail=False, methods=["get"], permission_classes=[IsAdminUser], url_path="pending")
    def pending(self, request):
        qs = Charity.objects.filter(is_active=True).exclude(
            verification_status=Charity.VERIFIED
        ).order_by("name")
        return Response(CharitySerializer(qs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["patch"], permission_classes=[IsAdminUser])
    def verify(self, request, pk=None):
        charity = get_object_or_404(Charity, pk=pk)
        charity.verification_status = Charity.VERIFIED
        charity.verified_at = timezone.now()
        charity.save(update_fields=["verification_status", "verified_at"])
        AuditLog.objects.create(
            actor=request.user, action="charity.verify",
            target_type="charity", target_id=str(charity.id),
            metadata={"name": charity.name},
        )
        return Response(CharitySerializer(charity, context={"request": request}).data)

    @action(detail=True, methods=["patch"], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        charity = get_object_or_404(Charity, pk=pk)
        charity.verification_status = Charity.REJECTED
        charity.save(update_fields=["verification_status"])
        AuditLog.objects.create(
            actor=request.user, action="charity.reject",
            target_type="charity", target_id=str(charity.id),
            metadata={"name": charity.name},
        )
        return Response(CharitySerializer(charity, context={"request": request}).data)


class CampaignViewSet(CsrfExemptMixin, viewsets.ModelViewSet):
    """Public discovery (anonymous read) + host self-serve create/edit/moderate."""

    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = "slug"

    def get_serializer_class(self):
        if self.request.method in SAFE_METHODS:
            return CampaignSerializer
        return CampaignWriteSerializer

    def get_queryset(self):
        if self.action in ("update", "partial_update", "destroy", "mine"):
            return Campaign.objects.for_user(self.request.user)
        return Campaign.objects.filter(visibility=Campaign.PUBLIC).order_by("-created_at")

    def perform_create(self, serializer):
        campaign = serializer.save()
        AuditLog.objects.create(
            actor=self.request.user, action="campaign.create",
            target_type="campaign", target_id=str(campaign.id),
            metadata={"slug": campaign.slug, "status": campaign.status},
        )

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def mine(self, request):
        qs = Campaign.objects.for_user(request.user).order_by("-created_at")
        return Response(CampaignSerializer(qs, many=True, context={"request": request}).data)

    def _owned_campaign_or_404(self, request, slug):
        return get_object_or_404(Campaign.objects.for_user(request.user), slug=slug)

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated], url_path="guestbook")
    def guestbook(self, request, slug=None):
        """Host view of ALL guestbook messages (incl. pending) for moderation."""
        campaign = self._owned_campaign_or_404(request, slug)
        msgs = campaign.messages.all().order_by("-created_at")
        return Response(MessageSerializer(msgs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["patch"], permission_classes=[IsAuthenticated], url_path="moderate")
    def moderate(self, request, slug=None):
        """Host approves or hides a single guestbook message on their campaign."""
        campaign = self._owned_campaign_or_404(request, slug)
        message = get_object_or_404(Message, id=request.data.get("message_id"), campaign=campaign)
        decision = request.data.get("action")
        if decision == "approve":
            message.moderation_status = Message.APPROVED
            message.published_at = timezone.now()
        elif decision == "hide":
            message.moderation_status = Message.REJECTED
            message.published_at = None
        else:
            return Response({"error": "action must be 'approve' or 'hide'"}, status=400)
        message.save(update_fields=["moderation_status", "published_at", "updated_at"])
        AuditLog.objects.create(
            actor=request.user, action=f"message.{decision}",
            target_type="message", target_id=str(message.id),
            metadata={"campaign": campaign.slug},
        )
        return Response(MessageSerializer(message, context={"request": request}).data)


# ---------------------------------------------------------------------------
# YouTube (unchanged behavior)
# ---------------------------------------------------------------------------
def youtube_video_details(request):
    video_id = request.GET.get("videoId")
    api_key = os.getenv("YOUTUBE_API_KEY")
    if not video_id:
        return JsonResponse({"error": "Missing videoId parameter"}, status=400)
    url = (
        "https://www.googleapis.com/youtube/v3/videos"
        f"?part=snippet,liveStreamingDetails&id={video_id}&key={api_key}"
    )
    try:
        response = requests.get(url)
        return JsonResponse(response.json(), safe=False)
    except requests.RequestException as e:
        return JsonResponse({"error": "Failed to fetch video details", "details": str(e)}, status=500)


class YouTubeProxyView(APIView):
    def get(self, request):
        video_id = request.GET.get("videoId")
        if not video_id:
            return Response({"error": "Missing videoId parameter"}, status=400)

        cache_key = f"youtube_video_{video_id}"
        cached_response = cache.get(cache_key)
        if cached_response:
            return Response(cached_response)

        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        refresh_token = os.getenv("GOOGLE_REFRESH_TOKEN")
        if not all([client_id, client_secret, refresh_token]):
            logger.error("Missing one or more Google OAuth credentials")
            return Response({"error": "Missing credentials"}, status=500)

        try:
            token_response = requests.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            token_response.raise_for_status()
            access_token = token_response.json().get("access_token")
            if not access_token:
                return Response({"error": "Token exchange failed"}, status=500)
        except Exception as e:
            logger.exception("Error refreshing token")
            return Response({"error": "Token refresh error", "details": str(e)}, status=500)

        try:
            credentials = Credentials(token=access_token)
            youtube = build("youtube", "v3", credentials=credentials)
            response = youtube.videos().list(
                part="snippet,status,liveStreamingDetails", id=video_id
            ).execute()
            cache.set(cache_key, response, timeout=60)
            return Response(response)
        except Exception as e:
            logger.exception("YouTube API call failed")
            return Response({"error": "YouTube API error", "details": str(e)}, status=500)
