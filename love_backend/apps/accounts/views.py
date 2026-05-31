"""Account endpoints: self-serve registration.

POST /api/register/  -> create a user, start a session, return the identity shape
the frontend AuthContext expects (same fields as donations.views.me).
"""
from django.contrib.auth import login
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    renderer_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from donations.utils import CsrfExemptSessionAuthentication
from .serializers import RegisterSerializer


@api_view(["POST"])
@renderer_classes([JSONRenderer])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = serializer.save()
    # Log the new user straight in (session cookie), same as a fresh login.
    login(request, user)
    return Response(
        {
            "authenticated": True,
            "username": user.username,
            "display_name": (user.get_full_name() or user.first_name or user.username),
            "isAdmin": user.is_staff,
        },
        status=201,
    )
