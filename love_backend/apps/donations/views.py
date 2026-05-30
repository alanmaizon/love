import json
import logging
import os
from datetime import timedelta

import requests
from django.contrib.auth import authenticate, login, logout
from django.core.cache import cache
from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from rest_framework import status as drf_status
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView

from campaigns.models import Campaign
from messaging.models import Message

from .helpers import send_donation_confirmation_email
from .mixins import CsrfExemptMixin
from .models import Charity, Donation
from .serializers import (
    CampaignSerializer,
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
    """Lightweight identity for the frontend AuthContext (no Profile/PII)."""
    u = request.user
    if not u.is_authenticated:
        return Response({"authenticated": False})
    return Response({
        "authenticated": True,
        "username": u.username,
        "display_name": (u.get_full_name() or u.first_name or u.username),
        "isAdmin": u.is_staff,
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
    queryset = Charity.objects.filter(is_active=True)
    serializer_class = CharitySerializer
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_permissions(self):
        if self.request.method in SAFE_METHODS:
            return [AllowAny()]
        return [IsAdminUser()]


class CampaignViewSet(CsrfExemptMixin, viewsets.ReadOnlyModelViewSet):
    """Read-only public discovery of public campaigns; lookup by slug."""

    serializer_class = CampaignSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return Campaign.objects.filter(visibility=Campaign.PUBLIC).order_by("-created_at")


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
