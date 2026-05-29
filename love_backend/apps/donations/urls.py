from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import YouTubeProxyView, DonationViewSet, CharityViewSet, login_view, logout_view, donation_analytics, profile_detail, public_profile
from .charts import combined_charts
from . import views

router = DefaultRouter()
router.register(r'donations', DonationViewSet)
router.register(r'charities', CharityViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('youtube-video-details', views.youtube_video_details, name='youtube_video_details'),
    path('youtube-proxy/', YouTubeProxyView.as_view(), name='youtube-proxy'),
    path('analytics/', donation_analytics, name='donation-analytics'),
    path('charts/', combined_charts, name='charts'),
    path('profile/', profile_detail, name='profile-detail'),
    path('public_profile/', public_profile, name='public_profile'),
]
