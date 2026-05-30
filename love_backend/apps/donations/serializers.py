from rest_framework import serializers

from campaigns.models import Campaign, CampaignBeneficiary
from messaging.models import Message

from .models import Charity, Donation


class CharitySerializer(serializers.ModelSerializer):
    """Public charity card. Read-only verification info; no ops/internal fields."""

    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Charity
        fields = [
            "id", "name", "slug", "description", "website", "logo_url",
            "verification_status", "is_verified",
        ]
        # contact_email / registration_number are intentionally NOT exposed.

    def get_logo_url(self, obj):
        return obj.get_logo_url() or ""


class BeneficiarySerializer(serializers.ModelSerializer):
    charity = CharitySerializer(read_only=True)

    class Meta:
        model = CampaignBeneficiary
        fields = ["charity", "split_percent"]


class CampaignSerializer(serializers.ModelSerializer):
    """Public campaign page payload. No owner PII beyond a display name."""

    beneficiaries = BeneficiarySerializer(many=True, read_only=True)
    cover_image_url = serializers.SerializerMethodField()
    host_display_name = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = [
            "id", "type", "title", "slug", "story", "cover_image_url",
            "event_date", "location", "goal_amount", "currency",
            "visibility", "status", "host_display_name", "beneficiaries",
            "created_at",
        ]

    def get_cover_image_url(self, obj):
        return obj.cover_image.url if obj.cover_image else ""

    def get_host_display_name(self, obj):
        # A friendly label only — never the owner's email/username for PII safety.
        return (obj.owner.get_full_name() or obj.owner.first_name or "Host").strip()


class MessageSerializer(serializers.ModelSerializer):
    """Public guestbook entry. Anonymous donors render as 'Anonymous'."""

    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "display_name", "body", "created_at", "published_at"]

    def get_display_name(self, obj):
        return "Anonymous" if obj.is_anonymous else obj.display_name


class DonationSerializer(serializers.ModelSerializer):
    """
    Donor email is stripped for non-staff (PII). `status` and money fields are
    server-controlled — only set via the payment/webhook flow, never by the client.
    """

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get("request")
        if not request or not (request.user and request.user.is_staff):
            ret.pop("donor_email", None)
        return ret

    class Meta:
        model = Donation
        fields = [
            "id", "user", "charity", "campaign",
            "donor_name", "donor_email", "amount", "currency",
            "message", "is_anonymous", "status", "created_at", "updated_at",
        ]
        read_only_fields = [
            "user", "status", "currency", "created_at", "updated_at",
        ]

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["user"] = request.user
        else:
            validated_data["user"] = None
        return super().create(validated_data)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Donation amount must be greater than zero.")
        return value
