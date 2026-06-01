"""
Trim stored Stripe webhook payloads older than WEBHOOK_PAYLOAD_RETENTION_DAYS.

Keeps stripe_event_id, event_type, status for audit; clears bulky JSON.
"""
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from payments.models import WebhookEvent


class Command(BaseCommand):
    help = "Clear old WebhookEvent.payload JSON (retention policy)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=None,
            help="Override WEBHOOK_PAYLOAD_RETENTION_DAYS from settings",
        )
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **opts):
        days = opts["days"] or getattr(settings, "WEBHOOK_PAYLOAD_RETENTION_DAYS", 90)
        cutoff = timezone.now() - timedelta(days=days)
        qs = WebhookEvent.objects.filter(created_at__lt=cutoff).exclude(payload={})
        count = qs.count()
        if opts["dry_run"]:
            self.stdout.write(f"Would trim payload on {count} WebhookEvent row(s) older than {days}d")
            return
        updated = qs.update(payload={})
        self.stdout.write(self.style.SUCCESS(f"Trimmed payload on {updated} webhook row(s)"))
