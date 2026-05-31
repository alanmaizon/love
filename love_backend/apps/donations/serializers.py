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
        # verification_status/slug are server-controlled: a charity owner must
        # never be able to self-verify or change their slug via the API. Only a
        # platform admin moves verification (the verify-queue endpoints).
        read_only_fields = ["slug", "verification_status", "is_verified"]

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


class CampaignWriteSerializer(serializers.ModelSerializer):
    """Host-facing create/update. `owner` is set from the request (never trusted
    from input); a single beneficiary `charity` id is accepted and mirrored into a
    CampaignBeneficiary at 100% (single-charity UI; model supports splits)."""

    charity = serializers.PrimaryKeyRelatedField(
        queryset=Charity.objects.filter(is_active=True), write_only=True, required=False
    )

    class Meta:
        model = Campaign
        fields = [
            "id", "type", "title", "story", "cover_image", "event_date",
            "location", "goal_amount", "currency", "visibility", "status", "charity",
        ]

    def validate(self, attrs):
        # Publish gate: a campaign can only go active once it benefits a charity
        # that is verified AND payout-ready — same invariant the checkout enforces.
        status = attrs.get("status", getattr(self.instance, "status", Campaign.DRAFT))
        if status == Campaign.ACTIVE:
            charity = attrs.get("charity") or self._current_beneficiary()
            if charity is None:
                raise serializers.ValidationError(
                    {"charity": "Choose a beneficiary charity before publishing."}
                )
            payout = getattr(charity, "payout_account", None)
            if not charity.is_verified or not (payout and payout.charges_enabled):
                raise serializers.ValidationError(
                    {"status": "This charity is not yet verified and payout-ready, "
                               "so the campaign cannot be published."}
                )
        return attrs

    def _current_beneficiary(self):
        if not self.instance:
            return None
        link = self.instance.beneficiaries.first()
        return link.charity if link else None

    def _unique_slug(self, title):
        from django.utils.text import slugify
        base = slugify(title) or "campaign"
        slug, n = base, 2
        qs = Campaign.objects.all()
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        while qs.filter(slug=slug).exists():
            slug = f"{base}-{n}"
            n += 1
        return slug

    def create(self, validated_data):
        charity = validated_data.pop("charity", None)
        request = self.context.get("request")
        validated_data["owner"] = request.user
        validated_data["slug"] = self._unique_slug(validated_data["title"])
        campaign = super().create(validated_data)
        if charity is not None:
            CampaignBeneficiary.objects.create(campaign=campaign, charity=charity, split_percent=100)
        return campaign

    def update(self, instance, validated_data):
        charity = validated_data.pop("charity", None)
        campaign = super().update(instance, validated_data)
        if charity is not None:
            campaign.beneficiaries.all().delete()
            CampaignBeneficiary.objects.create(campaign=campaign, charity=charity, split_percent=100)
        return campaign

    def to_representation(self, instance):
        # Echo back the full public shape after a write.
        return CampaignSerializer(instance, context=self.context).data


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
