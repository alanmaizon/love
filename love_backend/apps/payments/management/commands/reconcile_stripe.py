"""
Compare confirmed donations to LedgerEntry rows and (optionally) Stripe PaymentIntents.

    python manage.py reconcile_stripe
    python manage.py reconcile_stripe --since-days 90 --charity-slug marys-meals
    python manage.py reconcile_stripe --no-stripe   # ledger-only (imports, smoke)
"""
from datetime import timedelta

import stripe
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from donations.models import Donation
from payments.reconciliation import reconcile_donations


class Command(BaseCommand):
    help = "Reconcile confirmed donations against ledger and Stripe."

    def add_arguments(self, parser):
        parser.add_argument("--since-days", type=int, default=365)
        parser.add_argument("--charity-slug", type=str, default="")
        parser.add_argument(
            "--no-stripe",
            action="store_true",
            help="Skip Stripe API (ledger checks only)",
        )
        parser.add_argument(
            "--include-legacy",
            action="store_true",
            help="Also check CSV-imported confirmed rows (no PaymentIntent / ledger)",
        )

    def handle(self, *args, **opts):
        since = timezone.now() - timedelta(days=opts["since_days"])
        qs = Donation.objects.filter(status="confirmed", created_at__gte=since).select_related(
            "charity", "campaign"
        )
        if opts["charity_slug"]:
            qs = qs.filter(charity__slug=opts["charity_slug"])

        stripe_client = None
        fetch_stripe = not opts["no_stripe"]
        if fetch_stripe:
            if not settings.STRIPE_SECRET_KEY:
                self.stdout.write(self.style.WARNING("STRIPE_SECRET_KEY unset — ledger-only"))
                fetch_stripe = False
            else:
                stripe.api_key = settings.STRIPE_SECRET_KEY
                stripe_client = stripe

        summary = reconcile_donations(
            qs,
            fetch_stripe=fetch_stripe,
            stripe_client=stripe_client,
            include_legacy=opts["include_legacy"],
        )
        self.stdout.write(f"Checked {summary.checked} Stripe-era confirmed donation(s) since {since.date()}")
        if not opts["include_legacy"]:
            skipped = qs.count() - summary.checked
            if skipped:
                self.stdout.write(f"Skipped {skipped} legacy import row(s) (use --include-legacy to audit)")

        if summary.ok:
            self.stdout.write(self.style.SUCCESS("reconcile_stripe: no issues"))
            return

        for issue in summary.issues:
            self.stdout.write(
                self.style.ERROR(f"  donation {issue.donation_id} [{issue.code}]: {issue.detail}")
            )
        self.stdout.write(self.style.ERROR(f"\nreconcile_stripe FAILED ({len(summary.issues)} issue(s))"))
        raise SystemExit(1)
