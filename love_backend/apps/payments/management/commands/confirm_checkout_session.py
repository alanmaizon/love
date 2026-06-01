"""Confirm a pending donation from a Stripe Checkout session (local dev recovery)."""
from django.core.management.base import BaseCommand, CommandError

from donations.models import Donation
from payments import services
from payments.webhooks import _handle_checkout_completed


class Command(BaseCommand):
    help = "Confirm donation from cs_... when webhooks never reached localhost."

    def add_arguments(self, parser):
        parser.add_argument("session_id", help="Stripe Checkout session id (cs_...)")

    def handle(self, *args, **options):
        session_id = options["session_id"].strip()
        if not session_id.startswith("cs_"):
            raise CommandError("Expected a Checkout session id starting with cs_")

        session = services._client().checkout.Session.retrieve(session_id)
        data = session.to_dict() if hasattr(session, "to_dict") else dict(session)
        _handle_checkout_completed(data)

        donation_id = (data.get("metadata") or {}).get("donation_id")
        donation = Donation.objects.filter(id=donation_id).first()
        if not donation:
            raise CommandError("No donation linked to this session metadata.")
        self.stdout.write(self.style.SUCCESS(
            f"Donation {donation.id} -> {donation.status} "
            f"(pi={donation.stripe_payment_intent_id})"
        ))
