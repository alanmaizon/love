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

from donations.throttles import RegisterRateThrottle
from .serializers import RegisterSerializer


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
    return Response(
        {
            "authenticated": False,
            "message": "Account created. Please log in.",
            "username": user.username,
        },
        status=201,
    )
