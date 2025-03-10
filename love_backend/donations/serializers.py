from rest_framework import serializers
from .models import Profile, Charity, Donation


class ProfileSerializer(serializers.ModelSerializer):
    profile_picture_url = serializers.SerializerMethodField()

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
            'bank_name', 
            'account_number', 
            'revolut_username',
        ]

    def get_profile_picture_url(self, obj):
        return obj.get_profile_picture_url() or ""


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