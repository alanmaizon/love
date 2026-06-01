"""Print Stripe webhook setup status for local dev (why donations stay pending)."""
from django.conf import settings
from django.core.management.base import BaseCommand

from donations.models import Donation
from payments.models import WebhookEvent


class Command(BaseCommand):
    help = "Diagnose why donations stay pending (Stripe webhook not reaching Django)."

    def handle(self, *args, **options):
        secret = (settings.STRIPE_WEBHOOK_SECRET or "").strip()
        sk = (settings.STRIPE_SECRET_KEY or "").strip()

        self.stdout.write("Stripe webhook diagnostics")
        self.stdout.write("-" * 40)
        self.stdout.write(f"  STRIPE_SECRET_KEY set: {bool(sk)}")
        self.stdout.write(f"  STRIPE_WEBHOOK_SECRET set: {bool(secret)}")
        if secret:
            ok = secret.startswith("whsec_")
            self.stdout.write(
                self.style.WARNING("  whsec_ prefix OK" if ok else "  Expected whsec_... from Stripe CLI")
            )
        else:
            self.stdout.write(self.style.ERROR("  Missing STRIPE_WEBHOOK_SECRET in .env"))

        pending = Donation.objects.filter(status="pending").count()
        wh_count = WebhookEvent.objects.count()
        self.stdout.write(f"  Pending donations: {pending}")
        self.stdout.write(f"  WebhookEvent rows: {wh_count}")

        if wh_count == 0 and pending:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING(
                "Checkout alone does NOT confirm donations. Stripe must POST to Django."
            ))
            self.stdout.write("  1. Terminal A: python manage.py runserver")
            self.stdout.write(
                "  2. Terminal B: stripe listen --forward-to "
                "localhost:8000/api/payments/webhook/"
            )
            self.stdout.write(
                "  3. Copy the whsec_... printed by `stripe listen` into .env "
                "as STRIPE_WEBHOOK_SECRET"
            )
            self.stdout.write("  4. Restart runserver (secret is read at startup)")
            self.stdout.write("  5. Donate again — runserver should log POST .../webhook/ 200")
            self.stdout.write("")
            self.stdout.write(
                "If you see POST .../webhook/ 400: whsec in .env does not match "
                "the current `stripe listen` session (re-copy after each listen)."
            )
