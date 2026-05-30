from django.urls import path

from . import views
from .webhooks import stripe_webhook

urlpatterns = [
    path("config/", views.config, name="payments-config"),
    path("checkout/", views.create_checkout, name="payments-checkout"),
    path("connect/", views.start_connect_onboarding, name="payments-connect"),
    path("webhook/", stripe_webhook, name="payments-webhook"),
]
