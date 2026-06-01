"""
Remove placeholder PayoutAccount rows left by an older smoke_donate_flow (acct_smoke_test).

After running, wire real Stripe test Connect accounts:

  python manage.py repair_placeholder_payouts
  python manage.py import_donations --csv ../love_frontend/public/data/donations.csv \\
      --stripe-account acct_YOUR_TEST_CONNECTED_ACCOUNT
"""
from django.core.management.base import BaseCommand

from donations.models import PayoutAccount

class Command(BaseCommand):
    help = "Delete local-only placeholder Stripe account ids that break real Checkout."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="List rows that would be deleted without deleting.",
        )

    def handle(self, *args, **options):
        qs = PayoutAccount.objects.filter(stripe_account_id__startswith="acct_smoke")
        rows = list(qs)
        if not rows:
            self.stdout.write(self.style.SUCCESS("No placeholder payout accounts found."))
            return

        for p in rows:
            self.stdout.write(f"  · {p.charity.name}: {p.stripe_account_id}")
        if options["dry_run"]:
            self.stdout.write(f"Would delete {len(rows)} placeholder(s).")
            return

        deleted, _ = qs.delete()
        self.stdout.write(self.style.SUCCESS(
            f"Deleted {deleted} placeholder payout account(s). "
            "Re-run import_donations with --stripe-account acct_... (test mode) "
            "or complete Connect onboarding per charity."
        ))
