"""Account registration. No custom user model — we use Django's auth.User and
map the optional display name onto first_name (mirrors how `me`/AuthContext read
display_name elsewhere)."""
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .verification import send_verification_email


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=False, allow_blank=True)

    def validate_email(self, value):
        value = (value or "").strip()
        if getattr(settings, "REQUIRE_EMAIL_VERIFICATION", False) and not value:
            raise serializers.ValidationError("Email is required to create an account.")
        return value
    password = serializers.CharField(write_only=True)
    display_name = serializers.CharField(required=False, allow_blank=True)

    def validate_username(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Username is required.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("That username is already taken.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def create(self, validated_data):
        user = User(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            first_name=validated_data.get("display_name", "").strip(),
        )
        user.set_password(validated_data["password"])
        user.save()
        if user.email and getattr(settings, "REQUIRE_EMAIL_VERIFICATION", False):
            send_verification_email(user)
        elif user.email and not getattr(settings, "REQUIRE_EMAIL_VERIFICATION", False):
            from .models import UserProfile
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.email_verified = True
            profile.save(update_fields=["email_verified"])
        return user
