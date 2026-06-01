"""Account endpoints: self-serve registration.

POST /api/register/  -> create a user (no auto-login; client must POST /api/login/).
"""
from django.db import IntegrityError
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    renderer_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from rest_framework.permissions import IsAuthenticated

from donations.throttles import RegisterRateThrottle
from .serializers import RegisterSerializer
from .verification import email_verified, send_verification_email, verify_token


@api_view(["POST"])
@renderer_classes([JSONRenderer])
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
@throttle_classes([RegisterRateThrottle])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        user = serializer.save()
    except IntegrityError:
        return Response(
            {"username": ["That username is already taken."]},
            status=400,
        )
    payload = {
        "authenticated": False,
        "message": "Account created. Please log in.",
        "username": user.username,
    }
    if user.email:
        payload["email"] = user.email
        payload["email_verification_sent"] = bool(user.email)
        if email_verified(user):
            payload["message"] = "Account created. Please log in."
        else:
            payload["message"] = (
                "Account created. Check your email to verify before publishing."
            )
    return Response(payload, status=201)


@api_view(["POST"])
@renderer_classes([JSONRenderer])
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
def verify_email(request):
    token = (request.data.get("token") or "").strip()
    user, err = verify_token(token)
    if err:
        return Response({"error": err}, status=400)
    return Response({"message": "Email verified.", "username": user.username})


@api_view(["POST"])
@renderer_classes([JSONRenderer])
@authentication_classes([SessionAuthentication])
@permission_classes([IsAuthenticated])
def resend_verification_email(request):
    user = request.user
    if email_verified(user):
        return Response({"message": "Email already verified."})
    if not (user.email or "").strip():
        return Response({"error": "Add an email address to your account first."}, status=400)
    send_verification_email(user, request)
    return Response({"message": "Verification email sent."})
