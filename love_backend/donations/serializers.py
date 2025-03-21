from rest_framework import serializers
from .models import Profile, Charity, Donation


class ProfileSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()
    isAdmin = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'id', 
            'bride_name', 
            'groom_name', 
            'wedding_date', 
            'bio', 
            'location', 
            'profile_picture_url',
            'isAdmin',
        ]

    def get_profile_picture_url(self, obj):
        return obj.get_profile_picture_url() or ""

    def get_isAdmin(self, obj):
        # Assumes that the Profile is linked to a User instance.
        return obj.user.is_staff  # or obj.user.is_superuser if you prefer
    

class CharitySerializer(serializers.ModelSerializer):
    """
    Serializer for the Charity model.
    It exposes the basic details of each charity.
    """
    class Meta:
        model = Charity
        fields = ['id', 'name', 'description', 'website', 'logo']



class DonationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Donation
        fields = [
            'id',
            'user',
            'charity',
            'donor_name',
            'donor_email',
            'amount',
            'message',
            'status',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['user', 'status', 'created_at', 'updated_at']

    def create(self, validated_data):
        request = self.context.get('request')
        # If the user is authenticated, assign them; otherwise, leave user as None.
        if request and request.user and request.user.is_authenticated:
            validated_data['user'] = request.user
        else:
            validated_data['user'] = None
        return super().create(validated_data)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Donation amount must be greater than zero.")
        return value