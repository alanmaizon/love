"""Phase 1 post-deploy verification (run inside ECS one-off task or SSH)."""
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Verify production env: DB, Stripe secrets, DEBUG off."

    def handle(self, *args, **options):
        ok = True

        if settings.DEBUG:
            self.stdout.write(self.style.ERROR("DEBUG is True — use config.settings.prod"))
            ok = False
        else:
            self.stdout.write(self.style.SUCCESS("DEBUG=False"))

        sk = (settings.SECRET_KEY or "").strip()
        if not sk or sk in ("dev-only-insecure-key", "change-me-generate-a-long-random-string"):
            self.stdout.write(self.style.ERROR("SECRET_KEY missing or insecure"))
            ok = False
        else:
            self.stdout.write(self.style.SUCCESS("SECRET_KEY set"))

        for name in ("STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "FRONTEND_URL"):
            val = getattr(settings, name, "") or ""
            if not val.strip():
                self.stdout.write(self.style.ERROR(f"{name} not set"))
                ok = False
            else:
                self.stdout.write(self.style.SUCCESS(f"{name} set"))

        try:
            connection.ensure_connection()
            self.stdout.write(self.style.SUCCESS(f"Database OK ({connection.vendor})"))
        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"Database failed: {exc}"))
            ok = False

        wh = __import__("payments.models", fromlist=["WebhookEvent"]).WebhookEvent.objects.count()
        self.stdout.write(f"WebhookEvent rows: {wh}")

        if ok:
            self.stdout.write(self.style.SUCCESS("\nPhase 1 post_deploy_check PASSED"))
        else:
            self.stdout.write(self.style.ERROR("\nPhase 1 post_deploy_check FAILED"))
            raise SystemExit(1)
