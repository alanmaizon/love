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
    """
    Serializer for handling donations.
    Includes logic for handling `skipCharity` where 50% is evenly distributed.
    """
    charities = CharitySerializer(many=True, read_only=True)
    skip_charity = serializers.BooleanField(required=False, default=False)

    class Meta:
        model = Donation
        fields = [
            'id',
            'user',
            'charities',
            'donor_name',
            'donor_email',
            'amount',
            'message',
            'status',
            'skip_charity',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['user', 'status', 'created_at', 'updated_at']

    def create(self, validated_data):
        """
        Custom create method:
        - If `skip_charity` is True, allocate 50% to all charities.
        - Otherwise, assign 100% to selected charity.
        """
        request = self.context.get('request')

        if request and request.user and request.user.is_authenticated:
            validated_data['user'] = request.user
        else:
            validated_data['user'] = None  # Allow guest donations

        skip_charity = validated_data.pop('skip_charity', False)
        donation = super().create(validated_data)

        if skip_charity:
            all_charities = Charity.objects.all()
            if all_charities.exists():
                per_charity_amount = (donation.amount * 0.5) / all_charities.count()
                for charity in all_charities:
                    donation.charities.add(charity, through_defaults={"amount": per_charity_amount})

        return donation

    def validate_amount(self, value):
        """
        Ensure the donation amount is greater than zero.
        """
        if value <= 0:
            raise serializers.ValidationError("Donation amount must be greater than zero.")
        return value
