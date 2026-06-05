"""
Prepare local DB for Playwright E2E (Stripe test mode).

Requires love_backend/.env with STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, and
E2E_STRIPE_ACCOUNT_ID (Connect test acct_...).

    python manage.py e2e_prepare
"""
import os

import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from campaigns.models import Campaign
from donations.models import Charity, PayoutAccount
from donations.stripe_payout import wire_stripe_account_to_charities
from messaging.models import Message

User = get_user_model()
HOST_USERNAME = "anna_alan"
CAMPAIGN_SLUG = "anna-and-alan"


def resolve_e2e_stripe_account_id() -> str:
    """E2E_STRIPE_ACCOUNT_ID, STRIPE_DEV_CONNECTED_ACCOUNT, or first charges-enabled Connect acct."""
    for key in ("E2E_STRIPE_ACCOUNT_ID", "STRIPE_DEV_CONNECTED_ACCOUNT"):
        acct = os.environ.get(key, "").strip()
        if acct.startswith("acct_"):
            return acct
    stripe.api_key = settings.STRIPE_SECRET_KEY
    accounts = stripe.Account.list(limit=10)
    for acct in accounts.data:
        if getattr(acct, "charges_enabled", False):
            return acct.id
    if accounts.data:
        return accounts.data[0].id
    return ""


class Command(BaseCommand):
    help = "Migrate, seed flagship campaign, wire Stripe Connect, set E2E host password."

    def handle(self, *args, **options):
        sk = (settings.STRIPE_SECRET_KEY or "").strip()
        pk = (getattr(settings, "STRIPE_PUBLISHABLE_KEY", "") or "").strip()
        acct = resolve_e2e_stripe_account_id()

        if not sk or sk.startswith("sk_test_..."):
            raise CommandError("Set STRIPE_SECRET_KEY in love_backend/.env (test mode).")
        if not pk or pk.startswith("pk_test_..."):
            raise CommandError("Set STRIPE_PUBLISHABLE_KEY in love_backend/.env.")
        if not acct:
            raise CommandError(
                "No Connect account: set E2E_STRIPE_ACCOUNT_ID=acct_... in .env or create one in "
                "Stripe Dashboard → Connect (test mode)."
            )
        if not acct.startswith("acct_"):
            raise CommandError(f"Invalid Connect account id: {acct!r}")

        call_command("migrate", verbosity=0)
        cache.clear()

        removed, _ = Message.objects.filter(body__startswith="E2E guestbook ").delete()
        if removed:
            self.stdout.write(self.style.SUCCESS(f"Removed {removed} prior E2E guestbook message(s)"))

        csv = os.path.join(
            settings.BASE_DIR.parent, "love_frontend", "public", "data", "donations.csv"
        )
        if os.path.isfile(csv):
            call_command("import_donations", csv=csv, verbosity=0)
        else:
            self.stdout.write(self.style.WARNING(f"CSV not found: {csv} — skipping import"))

        verified = Charity.objects.filter(
            verification_status=Charity.VERIFIED, is_active=True,
        )
        if not verified.exists():
            raise CommandError("No verified charities — run import_donations.")

        wire_stripe_account_to_charities(acct, list(verified))
        self.stdout.write(self.style.SUCCESS(f"Wired {acct} to {verified.count()} charities"))
        os.environ["E2E_STRIPE_ACCOUNT_ID"] = acct

        # `or` (not get-default): CI writes E2E_HOST_PASSWORD= (empty) when the
        # secret is unset, and the Playwright side falls back the same way, so
        # both must resolve an empty value to the shared default.
        host_password = os.environ.get("E2E_HOST_PASSWORD") or "e2e-test-pass-12!"
        host, created = User.objects.get_or_create(
            username=HOST_USERNAME,
            defaults={"first_name": "Anna & Alan", "email": "e2e-host@invalid.local"},
        )
        host.set_password(host_password)
        host.save()
        self.stdout.write(
            self.style.SUCCESS(
                f"Host user {HOST_USERNAME} password set ({'created' if created else 'updated'})"
            )
        )

        camp = Campaign.objects.filter(slug=CAMPAIGN_SLUG).first()
        if not camp:
            raise CommandError(f"Campaign {CAMPAIGN_SLUG} missing after import.")
        if camp.status != Campaign.ACTIVE:
            camp.status = Campaign.ACTIVE
            camp.save(update_fields=["status"])

        ready = verified.filter(payout_account__charges_enabled=True).exists()
        if not ready:
            PayoutAccount.objects.filter(stripe_account_id=acct).update(
                charges_enabled=True, payouts_enabled=True, details_submitted=True,
            )

        self.stdout.write(self.style.SUCCESS("e2e_prepare OK"))
        self.stdout.write(f"  E2E_HOST_USERNAME={HOST_USERNAME}")
        self.stdout.write(f"  E2E_CAMPAIGN_SLUG={CAMPAIGN_SLUG}")
        self.stdout.write(f"  FRONTEND_URL={getattr(settings, 'FRONTEND_URL', '')}")
