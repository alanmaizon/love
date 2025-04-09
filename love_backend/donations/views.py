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
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.db.models import Sum, Count, F, ExpressionWrapper, DecimalField
from decimal import Decimal
from .helpers import send_donation_confirmation_email 
import requests
from django.conf import settings


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

class YouTubeProxyView(APIView):
    def get(self, request):
        video_id = request.GET.get('videoId')
        if not video_id:
            return Response({'error': 'Missing videoId parameter'}, status=400)

        youtube_api_key = settings.YOUTUBE_API_KEY
        youtube_api_url = 'https://www.googleapis.com/youtube/v3/liveBroadcasts'

        try:
            response = requests.get(youtube_api_url, params={
                'part': 'snippet,status',
                'id': video_id,
                'key': youtube_api_key,
            })
            response.raise_for_status()
            return Response(response.json())
        except requests.exceptions.HTTPError as http_err:
            return Response({'error': 'YouTube API HTTP error', 'details': str(http_err)}, status=500)
        except requests.exceptions.RequestException as req_err:
            return Response({'error': 'YouTube API request error', 'details': str(req_err)}, status=500)