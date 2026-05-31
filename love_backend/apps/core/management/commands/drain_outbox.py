"""
Drain pending OutboxEvents (receipts, thank-you emails).

Run on a schedule (cron / ECS scheduled task / Lambda):
    python manage.py drain_outbox

Each event is processed at most once; failures are recorded and retried on the
next run (up to --max-attempts).
"""
import secrets

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from core.models import OutboxEvent
from donations.helpers import send_donation_confirmation_email
from donations.models import Donation, Receipt


class Command(BaseCommand):
    help = "Process pending OutboxEvents (receipts, emails)."

    def add_arguments(self, parser):
        parser.add_argument("--max-attempts", type=int, default=5)
        parser.add_argument("--limit", type=int, default=100)

    def handle(self, *args, **opts):
        max_attempts = opts["max_attempts"]
        qs = OutboxEvent.objects.filter(
            status__in=[OutboxEvent.PENDING, OutboxEvent.FAILED],
            attempts__lt=max_attempts,
        ).order_by("created_at")[: opts["limit"]]

        done = failed = 0
        for event in qs:
            try:
                with transaction.atomic():
                    locked = OutboxEvent.objects.select_for_update().get(pk=event.pk)
                    if locked.status == OutboxEvent.DONE:
                        continue
                    self._dispatch(locked)
                    locked.status = OutboxEvent.DONE
                    locked.processed_at = timezone.now()
                    locked.attempts += 1
                    locked.save(update_fields=["status", "processed_at", "attempts"])
                done += 1
            except Exception as exc:  # noqa: BLE001
                OutboxEvent.objects.filter(pk=event.pk).update(
                    status=OutboxEvent.FAILED,
                    attempts=F("attempts") + 1,
                    last_error=str(exc),
                )
                failed += 1
                self.stderr.write(f"  ! event {event.pk} failed: {exc}")

        self.stdout.write(self.style.SUCCESS(f"drained done={done} failed={failed}"))

    def _dispatch(self, event):
        if event.event_type == "donation.confirmed":
            donation = Donation.objects.get(id=event.payload["donation_id"])
            self._ensure_receipt(donation)
            send_donation_confirmation_email(donation)

    @staticmethod
    def _ensure_receipt(donation):
        if hasattr(donation, "receipt"):
            return
        year = donation.created_at.year if donation.created_at else timezone.now().year
        Receipt.objects.create(
            donation=donation,
            number=f"GIFT-{year}-{secrets.token_hex(8).upper()}",
            tax_year=year,
        )
