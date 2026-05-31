from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views
from .views import (
    CampaignViewSet,
    CharityViewSet,
    DonationViewSet,
    YouTubeProxyView,
    campaign_messages,
    donation_analytics,
    donation_stats,
    login_view,
    logout_view,
    me,
    public_campaign,
)

router = DefaultRouter()
router.register(r"donations", DonationViewSet)
router.register(r"charities", CharityViewSet)
router.register(r"campaigns", CampaignViewSet, basename="campaign")

urlpatterns = [
    path("", include(router.urls)),
    path("login/", login_view, name="login"),
    path("logout/", logout_view, name="logout"),
    path("me/", me, name="me"),
    # Public campaign (flagship by default, or by slug) + guestbook
    path("campaign/", public_campaign, name="public-campaign"),
    path("campaign/<slug:slug>/", public_campaign, name="public-campaign-detail"),
    path("messages/", campaign_messages, name="campaign-messages"),
    # Analytics + JSON stats (replaces the matplotlib PNG at /charts/)
    path("analytics/", donation_analytics, name="donation-analytics"),
    path("stats/", donation_stats, name="donation-stats"),
    # YouTube
    path("youtube-video-details", views.youtube_video_details, name="youtube_video_details"),
    path("youtube-proxy/", YouTubeProxyView.as_view(), name="youtube-proxy"),
]
