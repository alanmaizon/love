from rest_framework import viewsets, status as drf_status
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Profile, Donation, Charity
from .serializers import DonationSerializer, CharitySerializer, ProfileSerializer
from .mixins import CsrfExemptMixin
from .utils import CsrfExemptSessionAuthentication
import json
import os
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.db.models import Sum, Count, F, ExpressionWrapper, DecimalField
from django.core.cache import cache
from django.utils.encoding import force_str
from decimal import Decimal
from .helpers import send_donation_confirmation_email 
import requests
from django.conf import settings
import logging

def youtube_video_details(request):
    video_id = request.GET.get('videoId')
    api_key = 'YOUTUBE_API_KEY'

    if not video_id:
        return JsonResponse({'error': 'Missing videoId parameter'}, status=400)

    url = f'https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id={video_id}&key={api_key}'
    try:
        response = requests.get(url)
        return JsonResponse(response.json(), safe=False)
    except requests.RequestException as e:
        return JsonResponse({'error': 'Failed to fetch video details', 'details': str(e)}, status=500)
    

@api_view(['GET', 'PUT'])
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([IsAuthenticated])
def profile_detail(request):
    try:
        profile = request.user.profile
    except Profile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=404)
    
    if request.method == 'GET':
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

@api_view(['GET'])
@authentication_classes([])  # No need auth
@permission_classes([AllowAny])
def public_profile(request):
    try:
        # Shown our profile by default
        profile = Profile.objects.first()
    except Profile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=404)
    
    serializer = ProfileSerializer(profile)
    data = serializer.data
    data['isPublic'] = True  # Add flag
    return Response(data)

@api_view(['GET'])
def donation_analytics(request):
    confirmed_donations = Donation.objects.filter(status='confirmed')
    total_amount = confirmed_donations.aggregate(total=Sum('amount'))['total'] or 0
    charity_amount = total_amount * Decimal('0.5')
    couple_amount = total_amount * Decimal('0.5')
    donations_count = confirmed_donations.count()
    # Group by charity name and calculate both count and allocated total.
    count_per_charity = confirmed_donations.values('charity__name').annotate(
        count=Count('id'),
        total_allocated=Sum(ExpressionWrapper(F('amount') * Decimal('0.5'), output_field=DecimalField()))
    )
    return Response({
        "total_amount": total_amount,
        "charity_amount": charity_amount,
        "couple_amount": couple_amount,
        "donations_count": donations_count,
        "count_per_charity": list(count_per_charity),
    })

@csrf_exempt
def login_view(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
        
        username = data.get("username")
        password = data.get("password")
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return JsonResponse({"message": "Login successful"}, status=200)
        else:
            return JsonResponse({"error": "Invalid credentials"}, status=400)
    else:
        return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
def logout_view(request):
    if request.method == 'POST':
        logout(request)
        return JsonResponse({"message": "Logged out successfully"}, status=200)
    return JsonResponse({"error": "Method not allowed"}, status=405)

class DonationViewSet(CsrfExemptMixin, viewsets.ModelViewSet):
    queryset = Donation.objects.all()
    serializer_class = DonationSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [AllowAny]

    @action(detail=True, methods=['patch'], url_path='confirm')
    def confirm_donation(self, request, pk=None):
        donation = self.get_object()
        donation.status = 'confirmed'
        donation.save()
        try:
            send_donation_confirmation_email(donation)
        except Exception as e:
            print(f"Email failed: {e}")  # Logs any email error

        serializer = self.get_serializer(donation)
        return Response(serializer.data, status=drf_status.HTTP_200_OK) 

    @action(detail=True, methods=['patch'], url_path='fail')
    def fail_donation(self, request, pk=None):
        donation = self.get_object()
        donation.status = 'failed'
        donation.save()
        serializer = self.get_serializer(donation)
        return Response(serializer.data, status=drf_status.HTTP_200_OK)

class CharityViewSet(CsrfExemptMixin, viewsets.ModelViewSet):
    queryset = Charity.objects.all()
    serializer_class = CharitySerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [AllowAny]


logger = logging.getLogger(__name__)

class YouTubeProxyView(APIView):
    def get(self, request):
        video_id = request.GET.get('videoId')
        if not video_id:
            return Response({'error': 'Missing videoId parameter'}, status=400)

        cache_key = f'youtube_video_{video_id}'
        cached_response = cache.get(cache_key)
        if cached_response:
            logger.info(f"Returning cached YouTube response for videoId={video_id}")
            return Response(cached_response)

        # Simpler: load credentials from flat env vars
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        refresh_token = os.getenv("GOOGLE_REFRESH_TOKEN")
        token_uri = "https://oauth2.googleapis.com/token"

        if not all([client_id, client_secret, refresh_token]):
            logger.error("Missing one or more Google OAuth credentials")
            return Response({'error': 'Missing credentials'}, status=500)

        try:
            token_response = requests.post(
                token_uri,
                data={
                    'client_id': client_id,
                    'client_secret': client_secret,
                    'refresh_token': refresh_token,
                    'grant_type': 'refresh_token',
                }
            )
            token_response.raise_for_status()
            token_data = token_response.json()
            access_token = token_data.get('access_token')
            if not access_token:
                logger.error(f"Access token missing: {token_data}")
                return Response({'error': 'Token exchange failed', 'details': token_data}, status=500)
        except Exception as e:
            logger.exception("Error refreshing token")
            return Response({'error': 'Token refresh error', 'details': str(e)}, status=500)

        try:
            credentials = Credentials(token=access_token)
            youtube = build('youtube', 'v3', credentials=credentials)
            response = youtube.videos().list(
                part='snippet,status,liveStreamingDetails',
                id=video_id
            ).execute()

            cache.set(cache_key, response, timeout=60)
            return Response(response)
        except Exception as e:
            logger.exception("YouTube API call failed")
            return Response({'error': 'YouTube API error', 'details': str(e)}, status=500)
