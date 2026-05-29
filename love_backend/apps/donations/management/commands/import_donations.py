"""
Idempotent importer for the historical wedding donations CSV.

Usage (from love_backend/):
    python manage.py import_donations \
        --csv ../love_frontend/public/data/donations.csv

    # preview without writing anything:
    python manage.py import_donations --csv <path> --dry-run

Safe to run more than once: existing donations (matched on
donor_email + amount + message) are skipped, not duplicated.

Note: confirmation emails are only sent by the manual `confirm_donation`
admin/API action, never on create — so importing history does NOT email
your wedding guests.
"""

import csv
from datetime import datetime
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from donations.models import Charity, Donation

# CSV charity_id -> real charity name.
# Rename these to your actual charities (or rename later in the admin —
# the importer matches charities by name via get_or_create).
CHARITY_NAMES = {
    "1": "Charity #1 (rename me)",
    "2": "Charity #2 (rename me)",
    "3": "Charity #3 (rename me)",
}

# Map any casing of the CSV status onto the model's lowercase choices.
STATUS_MAP = {
    "confirmed": "confirmed",
    "pending": "pending",
    "failed": "failed",
}


class Command(BaseCommand):
    help = "Import historical donations from donations.csv into the database."

    def add_arguments(self, parser):
        parser.add_argument(
            "--csv",
            required=True,
            help="Path to donations.csv",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and report, but write nothing to the database.",
        )

    def handle(self, *args, **options):
        path = options["csv"]
        dry_run = options["dry_run"]

        try:
            with open(path, newline="", encoding="utf-8") as fh:
                rows = list(csv.DictReader(fh))
        except FileNotFoundError:
            raise CommandError(f"CSV not found: {path}")

        created, skipped, junk = self._import(rows, dry_run)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"Done. created={created} skipped(existing)={skipped} "
            f"junk(ignored)={junk} {'[DRY RUN — nothing written]' if dry_run else ''}"
        ))

    @transaction.atomic
    def _import(self, rows, dry_run):
        created = skipped = junk = 0
        charity_cache = {}

        for row in rows:
            amount_raw = (row.get("amount") or "").strip()
            charity_id = (row.get("charity_id") or "").strip()
            donor_name = (row.get("donor_name") or "").strip()

            # Skip the empty/malformed trailing row in the CSV.
            if not amount_raw or not charity_id or not donor_name:
                junk += 1
                continue

            try:
                amount = Decimal(amount_raw)
            except InvalidOperation:
                self.stderr.write(f"  ! bad amount {amount_raw!r}, skipping row")
                junk += 1
                continue

            # Resolve (and cache) the charity for this row.
            if charity_id not in charity_cache:
                name = CHARITY_NAMES.get(charity_id, f"Charity #{charity_id}")
                if dry_run:
                    charity = Charity(name=name)
                else:
                    charity, _ = Charity.objects.get_or_create(name=name)
                charity_cache[charity_id] = charity
            charity = charity_cache[charity_id]

            message = (row.get("message") or "").strip()
            donor_email = (row.get("donor_email") or "").strip()
            status = STATUS_MAP.get((row.get("status") or "").strip().lower(), "confirmed")

            # Idempotency: match on the natural key of a donation.
            exists = Donation.objects.filter(
                donor_email=donor_email,
                amount=amount,
                message=message,
            ).exists()
            if exists:
                skipped += 1
                continue

            self.stdout.write(f"  + {donor_name} — €{amount} -> {charity.name}")
            if dry_run:
                created += 1
                continue

            donation = Donation.objects.create(
                charity=charity,
                donor_name=donor_name,
                donor_email=donor_email,
                amount=amount,
                message=message,
                status=status,
                user=None,
            )

            # created_at/updated_at are auto-managed, so bypass them with an
            # UPDATE to preserve the original timestamps from the CSV.
            ts = self._parse_dt(row.get("created_at"))
            if ts:
                Donation.objects.filter(pk=donation.pk).update(
                    created_at=ts,
                    updated_at=self._parse_dt(row.get("updated_at")) or ts,
                )
            created += 1

        if dry_run:
            transaction.set_rollback(True)
        return created, skipped, junk

    @staticmethod
    def _parse_dt(value):
        value = (value or "").strip()
        if not value:
            return None
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None
