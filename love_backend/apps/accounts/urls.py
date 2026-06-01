from django.urls import path

from .views import register, resend_verification_email, verify_email

urlpatterns = [
    path("register/", register, name="register"),
    path("verify-email/", verify_email, name="verify-email"),
    path("verify-email/resend/", resend_verification_email, name="verify-email-resend"),
]
