# love_backend/donations/urls.pys
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DonationViewSet, CharityViewSet, login_view, logout_view, donation_analytics, profile_detail, public_profile, youtube_proxy
from .charts import combined_charts

router = DefaultRouter()
router.register(r'donations', DonationViewSet)
router.register(r'charities', CharityViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('youtube-proxy/', youtube_proxy, name='youtube-proxy'),
    path('analytics/', donation_analytics, name='donation-analytics'),
    path('charts/', combined_charts, name='charts'),
    path('profile/', profile_detail, name='profile-detail'),
    path('public_profile/', public_profile, name='public_profile'),
]
