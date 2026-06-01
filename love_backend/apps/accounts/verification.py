"""Email verification helpers (Phase 4 publish gates)."""
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta

from .models import UserProfile

User = get_user_model()
TOKEN_MAX_AGE_HOURS = 48


def require_email_verification_enabled() -> bool:
    return bool(getattr(settings, "REQUIRE_EMAIL_VERIFICATION", False))


def get_or_create_profile(user) -> UserProfile:
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def email_verified(user) -> bool:
    if not require_email_verification_enabled():
        return True
    if not user or not user.is_authenticated:
        return False
    if user.is_staff or user.is_superuser:
        return True
    if not (user.email or "").strip():
        return False
    profile = get_or_create_profile(user)
    return profile.email_verified


def sync_profile_email_state(user):
    """Reset verification when the login email address changes."""
    profile = get_or_create_profile(user)
    if profile.email_verified and profile.verification_token:
        return
    if not (user.email or "").strip():
        profile.email_verified = False
        profile.save(update_fields=["email_verified"])


def send_verification_email(user, request=None) -> bool:
    email = (user.email or "").strip()
    if not email:
        return False
    profile = get_or_create_profile(user)
    profile.issue_verification_token()

    base = (getattr(settings, "FRONTEND_URL", "") or "http://localhost:5173").rstrip("/")
    link = f"{base}/verify-email?token={profile.verification_token}"
    subject = "Verify your email — Love That Gives Back"
    body = (
        f"Hi {user.first_name or user.username},\n\n"
        f"Confirm your email to publish registries and register charities:\n\n"
        f"{link}\n\n"
        f"This link expires in {TOKEN_MAX_AGE_HOURS} hours.\n"
    )
    send_mail(
        subject,
        body,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )
    return True


def verify_token(token: str):
    """Return (user, error_message)."""
    token = (token or "").strip()
    if not token:
        return None, "Missing token."
    try:
        profile = UserProfile.objects.select_related("user").get(
            verification_token=token
        )
    except UserProfile.DoesNotExist:
        return None, "Invalid or expired link."

    if not profile.token_created_at:
        return None, "Invalid or expired link."
    age = timezone.now() - profile.token_created_at
    if age > timedelta(hours=TOKEN_MAX_AGE_HOURS):
        return None, "This link has expired. Request a new verification email."

    profile.clear_verification_token()
    return profile.user, None
