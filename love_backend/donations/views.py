from rest_framework import viewsets, status as drf_status
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
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
from django.utils.crypto import get_random_string
from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import render, get_object_or_404


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
@authentication_classes([CsrfExemptSessionAuthentication])
@permission_classes([AllowAny])
def public_profile(request):
    try:
        # Assuming a single couple – return the first profile.
        profile = Profile.objects.first()
    except Profile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=404)
    serializer = ProfileSerializer(profile)
    return Response(serializer.data)


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

def confirm_donation(request):
    if request.method == "POST":
        amount = request.POST.get("amount")
        donor_name = request.POST.get("donor_name")
        donor_email = request.POST.get("donor_email")
        selected_charity_ids = request.POST.getlist("charities")
        selected_charities = Charity.objects.filter(id__in=selected_charity_ids)
        
        # Generate a unique reference ID
        reference_id = f"GIFT-{get_random_string(8).upper()}"
        
        # Save the donation (unverified until manually confirmed)
        donation = Donation.objects.create(
            donor_name=donor_name,
            donor_email=donor_email,
            amount=amount,
            reference_id=reference_id,
        )
        donation.charities.set(selected_charities)

        return render(request, "confirm_donation.html", {
            "donation": donation,
            "reference_id": reference_id,
            "bank_name": "Bank XYZ",
            "account_number": "12345678",
            "bank_identifier": "987654"
        })
    return render(request, "donation_form.html")


def mark_as_paid(request):
    reference_id = request.POST.get("reference_id")

    donation = Donation.objects.filter(reference_id=reference_id).first()
    if donation:
        donation.status = "Pending Confirmation"
        donation.save()
        return JsonResponse({"message": "Your payment is being verified."})
    return JsonResponse({"error": "Invalid Reference ID"}, status=400)


@api_view(['POST'])
@permission_classes([AllowAny])  # Allows guest donations without authentication
def create_donation(request):
    """
    Handle donation creation.
    - If a user selects a charity, 100% goes to that charity.
    - If no charity is selected (`skipCharity = true`), 50% is evenly split among all charities.
    - The remaining 50% goes to the couple.
    """
    try:
        data = request.data.copy()
        amount = float(data.get("amount", 0))
        skip_charity = data.get("skipCharity") in ["true", True, "1"]

        # Validate amount
        if amount <= 0:
            return JsonResponse({"error": "Invalid donation amount"}, status=400)

        serializer = DonationSerializer(data=data, context={'request': request})

        if serializer.is_valid():
            donation = serializer.save()

            if skip_charity:
                # Evenly distribute 50% of the amount across all charities
                all_charities = Charity.objects.all()
                if all_charities.exists():
                    per_charity_amount = (donation.amount * 0.5) / all_charities.count()
                    for charity in all_charities:
                        donation.charities.add(charity, through_defaults={"amount": per_charity_amount})

            return JsonResponse({"message": "Donation successful!", "donation_id": donation.id}, status=201)

        return JsonResponse({"error": serializer.errors}, status=400)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])  # Anyone can view donation details
def get_donation_details(request, donation_id):
    """
    Fetch details of a specific donation.
    """
    donation = get_object_or_404(Donation, id=donation_id)
    serializer = DonationSerializer(donation)
    return JsonResponse(serializer.data, safe=False)