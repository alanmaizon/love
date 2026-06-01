"""
Operational health: failed webhooks, stuck outbox, pending donations aging.

    python manage.py ops_health
    python manage.py ops_health --stuck-outbox-hours 2
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from core.models import OutboxEvent
from donations.models import Donation
from payments.models import WebhookEvent


class Command(BaseCommand):
    help = "Report failed Stripe webhooks, stuck outbox events, and stale pending donations."

    def add_arguments(self, parser):
        parser.add_argument("--stuck-outbox-hours", type=int, default=2)
        parser.add_argument("--pending-hours", type=int, default=24)
        parser.add_argument("--failed-webhook-days", type=int, default=7)

    def handle(self, *args, **opts):
        now = timezone.now()
        ok = True

        failed_wh = WebhookEvent.objects.filter(
            status=WebhookEvent.FAILED,
            created_at__gte=now - timedelta(days=opts["failed_webhook_days"]),
        ).count()
        if failed_wh:
            ok = False
            self.stdout.write(self.style.ERROR(f"Failed WebhookEvent (last {opts['failed_webhook_days']}d): {failed_wh}"))
        else:
            self.stdout.write(self.style.SUCCESS("No failed webhooks in window"))

        stuck_cutoff = now - timedelta(hours=opts["stuck_outbox_hours"])
        stuck_outbox = OutboxEvent.objects.filter(
            status__in=[OutboxEvent.PENDING, OutboxEvent.FAILED],
            created_at__lt=stuck_cutoff,
        ).count()
        if stuck_outbox:
            ok = False
            self.stdout.write(
                self.style.ERROR(
                    f"Stuck OutboxEvent (pending/failed older than {opts['stuck_outbox_hours']}h): {stuck_outbox}"
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS("Outbox queue not stuck"))

        pending_old = Donation.objects.filter(
            status="pending",
            created_at__lt=now - timedelta(hours=opts["pending_hours"]),
        ).count()
        if pending_old:
            self.stdout.write(
                self.style.WARNING(
                    f"Pending donations older than {opts['pending_hours']}h: {pending_old} "
                    "(checkout abandoned or webhook missing)"
                )
            )
        else:
            self.stdout.write(self.style.SUCCESS("No stale pending donations"))

        pending_outbox = OutboxEvent.objects.filter(status=OutboxEvent.PENDING).count()
        self.stdout.write(f"Outbox pending now: {pending_outbox}")

        if ok:
            self.stdout.write(self.style.SUCCESS("\nops_health PASSED"))
        else:
            self.stdout.write(self.style.ERROR("\nops_health FAILED"))
            raise SystemExit(1)
