"""
End-to-end local smoke: pending donation → webhook confirm → ledger → outbox → receipt.

Does not call Stripe. Use after migrate + import_donations to verify the money path.

  python manage.py smoke_donate_flow
  python manage.py smoke_donate_flow --drain   # also run drain_outbox (mock email)
"""
from decimal import Decimal
from unittest import mock

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from campaigns.models import Campaign
from donations.models import Charity, Donation, LedgerEntry, Receipt
from core.models import OutboxEvent
from payments.webhooks import _handle_checkout_completed


class Command(BaseCommand):
    help = "Smoke-test donate → webhook → ledger → outbox without Stripe network calls."

    def add_arguments(self, parser):
        parser.add_argument(
            "--drain",
            action="store_true",
            help="Run drain_outbox after confirming (emails mocked).",
        )

    def handle(self, *args, **options):
        campaign = Campaign.objects.filter(status=Campaign.ACTIVE).first()
        if campaign is None:
            raise CommandError(
                "No active campaign. Run: python manage.py import_donations "
                "--csv ../love_frontend/public/data/donations.csv"
            )

        charity = Charity.objects.filter(
            verification_status=Charity.VERIFIED, is_active=True,
        ).first()
        if charity is None:
            raise CommandError("No verified charity found.")

        # Do not create placeholder PayoutAccounts here — that breaks real
        # Stripe Checkout (transfer_data.destination must be a real acct_...).

        donation = Donation.objects.create(
            charity=charity,
            campaign=campaign,
            donor_name="Smoke Donor",
            donor_email="smoke@example.com",
            amount=Decimal("42.00"),
            message="Phase 0 smoke",
            status="pending",
        )
        self.stdout.write(f"  · created pending donation id={donation.id}")

        # Unique per donation so smoke is safe to re-run on a long-lived db.sqlite3.
        payment_intent_id = f"pi_smoke_{donation.id}"
        session = {
            "metadata": {"donation_id": str(donation.id)},
            "currency": "eur",
            "payment_intent": payment_intent_id,
            "payment_status": "paid",
        }
        with mock.patch(
            "payments.webhooks._platform_fee_from_stripe",
            return_value=Decimal("0"),
        ):
            with transaction.atomic():
                _handle_checkout_completed(session)

        donation.refresh_from_db()
        if donation.status != "confirmed":
            raise CommandError("Donation not confirmed after webhook.")

        entries = LedgerEntry.objects.filter(donation=donation)
        if not entries.exists():
            raise CommandError("No ledger entries written.")

        if not OutboxEvent.objects.filter(
            event_type="donation.confirmed",
            payload__donation_id=donation.id,
        ).exists():
            raise CommandError("Outbox event not enqueued.")

        self.stdout.write(self.style.SUCCESS(
            f"  · confirmed; ledger rows={entries.count()}; outbox queued"
        ))

        if options["drain"]:
            with mock.patch("donations.helpers.send_donation_confirmation_email"):
                call_command("drain_outbox")
            if Receipt.objects.filter(donation=donation).exists():
                self.stdout.write(self.style.SUCCESS("  · receipt issued via drain_outbox"))
            else:
                self.stderr.write(self.style.WARNING("  · drain ran but no receipt (check logs)"))

        self.stdout.write(self.style.SUCCESS(
            "\nPhase 0 smoke OK. For full Stripe test: stripe listen --forward-to "
            "localhost:8000/api/payments/webhook/ then donate at /donate"
        ))
