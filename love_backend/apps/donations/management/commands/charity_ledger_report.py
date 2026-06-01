"""
Charity totals from the append-only ledger (source of truth for received gifts).

    python manage.py charity_ledger_report
    python manage.py charity_ledger_report --charity-slug marys-meals --year 2025 --month 4
"""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db.models import Sum
from django.db.models.functions import TruncMonth

from donations.models import Charity, Donation, LedgerEntry


class Command(BaseCommand):
    help = "Sum donation_received ledger amounts per charity (optional month filter)."

    def add_arguments(self, parser):
        parser.add_argument("--charity-slug", type=str, default="")
        parser.add_argument("--year", type=int, default=0)
        parser.add_argument("--month", type=int, default=0, help="1-12; requires --year")

    def handle(self, *args, **opts):
        charity_slug = opts["charity_slug"]
        year = opts["year"]
        month = opts["month"]

        charities = Charity.objects.all().order_by("slug")
        if charity_slug:
            charities = charities.filter(slug=charity_slug)
            if not charities.exists():
                self.stderr.write(f"Unknown charity slug: {charity_slug}")
                raise SystemExit(1)

        for charity in charities:
            donation_ids = Donation.objects.filter(charity=charity, status="confirmed").values_list(
                "id", flat=True
            )
            qs = LedgerEntry.objects.filter(
                donation_id__in=donation_ids,
                entry_type=LedgerEntry.DONATION_RECEIVED,
                account=LedgerEntry.CHARITY,
            )
            if year:
                qs = qs.filter(created_at__year=year)
                if month:
                    qs = qs.filter(created_at__month=month)
                label = f"{year}" + (f"-{month:02d}" if month else "")
            else:
                label = "all time"

            total = qs.aggregate(total=Sum("amount"))["total"] or Decimal("0")
            count = qs.count()
            self.stdout.write(f"{charity.slug} ({charity.name}) [{label}]: €{total} ({count} ledger row(s))")

        if not year and not charity_slug:
            self.stdout.write("\nBy month (all charities, donation_received):")
            monthly = (
                LedgerEntry.objects.filter(
                    entry_type=LedgerEntry.DONATION_RECEIVED,
                    account=LedgerEntry.CHARITY,
                    donation__status="confirmed",
                )
                .annotate(month=TruncMonth("created_at"))
                .values("month")
                .annotate(total=Sum("amount"))
                .order_by("-month")[:12]
            )
            for row in monthly:
                m = row["month"]
                self.stdout.write(f"  {m:%Y-%m}: €{row['total'] or 0}")
