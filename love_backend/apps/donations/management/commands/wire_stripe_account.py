"""
Attach one Stripe test Connect account to all verified charities (local dev).

  python manage.py wire_stripe_account acct_1ABC...
"""
from django.core.management.base import BaseCommand, CommandError

from donations.stripe_payout import wire_stripe_account_to_charities


class Command(BaseCommand):
    help = "Wire the same Stripe Connect acct_ to every verified charity (no CSV re-import)."

    def add_arguments(self, parser):
        parser.add_argument(
            "stripe_account",
            help="Stripe Connect account id (acct_...)",
        )

    def handle(self, *args, **options):
        acct = options["stripe_account"].strip()
        try:
            wired = wire_stripe_account_to_charities(acct)
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        if not wired:
            raise CommandError("No verified active charities found.")

        for name, created, sid in wired:
            action = "created" if created else "updated"
            self.stdout.write(f"  · {action} {name} -> {sid}")
        self.stdout.write(self.style.SUCCESS(
            f"Wired {len(wired)} charities to {acct}. Try /donate again."
        ))
