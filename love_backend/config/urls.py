# config/urls.py
from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

if getattr(settings, "ADMIN_REQUIRE_2FA", False):
    from django_otp.admin import OTPAdminSite

    admin.site.__class__ = OTPAdminSite
    admin.site.site_header = "Love Admin (2FA required)"


def backend_root(request):
    return JsonResponse({"service": "love-api", "status": "ok"})


def health(request):
    """ALB/ECS health check — no DB hit (fast)."""
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path('', backend_root),
    path('health/', health),
    path('admin/', admin.site.urls),
    path('api/', include('donations.urls')),
    path('api/', include('accounts.urls')),
    path('api/payments/', include('payments.urls')),
]
