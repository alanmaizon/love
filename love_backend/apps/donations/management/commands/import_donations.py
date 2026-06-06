"""
Idempotent backfill of the historical wedding donations CSV into the v2 model.

From love_backend/:
    python manage.py import_donations --csv ../love_frontend/public/data/donations.csv
    python manage.py import_donations --csv <path> --dry-run   # preview, writes nothing

Safe to re-run: charities match by name, the campaign by slug, donations by
(donor_email, amount, message), and messages by their donation. Nothing is
duplicated.

What it does (CP2):
- creates/updates the 3 real charities as VERIFIED, with slug + website
- creates the flagship Campaign ("Anna & Alan's Wedding") owned by a host user,
  and links the charities as beneficiaries
- imports each donation, attaches it to the flagship campaign, preserves the
  original CSV timestamps
- copies each donation's message into the moderatable Message table (approved)

Money note: there is NO 50/50 split here — the full donated amount is recorded
as raised for charity, matching the v2 "money only reaches verified charities"
model. Confirmation emails are sent only by the manual confirm action, never on
import, so wedding guests are not emailed.
"""

import csv
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from donations.models import Charity, Donation
from donations.stripe_payout import wire_stripe_account_to_charities
from campaigns.models import Campaign, CampaignBeneficiary
from messaging.models import Message

# CSV charity_id -> real charity (name + public website).
CHARITIES = {
    "1": {"name": "Mary's Meals", "website": "https://www.marysmeals.org"},
    "2": {"name": "Operation Smile", "website": "https://www.operationsmile.org"},
    "3": {"name": "Xingu Vivo", "website": "https://xinguvivo.org.br"},
}

# Flagship campaign (the real wedding) — the launch seed + DEV.to material.
HOST_USERNAME = "anna_alan"
CAMPAIGN_TITLE = "Anna & Alan's Wedding"
CAMPAIGN_SLUG = "anna-and-alan"
CAMPAIGN_EVENT_DATE = date(2025, 4, 26)
CAMPAIGN_LOCATION = "Ireland"
CAMPAIGN_GOAL = Decimal("4000")
CAMPAIGN_STORY = (
    "In lieu of gifts, we asked our guests to help us celebrate by giving to "
    "causes close to our hearts. Every message below came with a donation. "
    "Thank you for being part of our day."
)

STATUS_MAP = {"confirmed": "confirmed", "pending": "pending", "failed": "failed"}


class Command(BaseCommand):
    help = "Backfill historical donations, the flagship campaign, charities, and messages."

    def add_arguments(self, parser):
        parser.add_argument("--csv", required=True, help="Path to donations.csv")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and report, but write nothing to the database.",
        )
        parser.add_argument(
            "--charity-fraction",
            default="1",
            metavar="FRACTION",
            help=(
                "Fraction of each CSV amount actually recorded as reaching "
                "charity. The historical wedding split donations 50/50, so use "
                "0.5 to record only the charitable half (the platform tracks "
                "charity money only). Default 1 = full amount. Re-running with a "
                "different fraction heals existing rows in place."
            ),
        )
        parser.add_argument(
            "--stripe-account",
            default="",
            metavar="ACCT_ID",
            help=(
                "Stripe test-mode connected account id (acct_...). When set, wires "
                "every verified charity to that account (same acct_ is OK locally). "
                "Or run: python manage.py wire_stripe_account acct_..."
            ),
        )

    def handle(self, *args, **options):
        path = options["csv"]
        dry_run = options["dry_run"]
        stripe_account = (options.get("stripe_account") or "").strip()
        try:
            fraction = Decimal(str(options.get("charity_fraction") or "1"))
        except InvalidOperation:
            raise CommandError(f"bad --charity-fraction: {options.get('charity_fraction')!r}")
        if fraction <= 0 or fraction > 1:
            raise CommandError("--charity-fraction must be in (0, 1]")

        try:
            with open(path, newline="", encoding="utf-8") as fh:
                rows = list(csv.DictReader(fh))
        except FileNotFoundError:
            raise CommandError(f"CSV not found: {path}")

        stats = self._import(rows, dry_run, stripe_account, fraction)

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            "Done. "
            f"charities={stats['charities']} "
            f"donations_created={stats['created']} "
            f"donations_skipped={stats['skipped']} "
            f"messages_created={stats['messages']} "
            f"junk={stats['junk']} "
            f"{'[DRY RUN — rolled back]' if dry_run else ''}"
        ))

    @transaction.atomic
    def _import(self, rows, dry_run, stripe_account="", fraction=Decimal("1")):
        stats = {"charities": 0, "created": 0, "skipped": 0, "messages": 0, "junk": 0}

        # --- 1. Charities (verified) ---
        charity_by_csv_id = {}
        for csv_id, info in CHARITIES.items():
            charity = self._upsert_charity(info)
            charity_by_csv_id[csv_id] = charity
            stats["charities"] += 1

        if stripe_account and not dry_run:
            for name, created, sid in wire_stripe_account_to_charities(
                stripe_account, charity_by_csv_id.values(),
            ):
                verb = "wired (new)" if created else "wired"
                self.stdout.write(f"  · {verb} {name} -> {sid}")

        # --- 2. Flagship campaign + beneficiaries ---
        campaign = self._get_or_create_campaign()
        for charity in charity_by_csv_id.values():
            CampaignBeneficiary.objects.get_or_create(
                campaign=campaign, charity=charity,
                defaults={"split_percent": Decimal("100")},
            )

        # --- 3. Donations + messages ---
        for row in rows:
            amount_raw = (row.get("amount") or "").strip()
            csv_id = (row.get("charity_id") or "").strip()
            donor_name = (row.get("donor_name") or "").strip()

            if not amount_raw or not csv_id or not donor_name:
                stats["junk"] += 1
                continue

            try:
                amount = Decimal(amount_raw)
            except InvalidOperation:
                self.stderr.write(f"  ! bad amount {amount_raw!r}, skipping")
                stats["junk"] += 1
                continue

            # The platform tracks charity money only. The historical wedding
            # split 50/50, so --charity-fraction records just the charitable
            # portion as the donation amount.
            recorded = (amount * fraction).quantize(Decimal("0.01"))

            charity = charity_by_csv_id.get(csv_id)
            if charity is None:
                self.stderr.write(f"  ! unknown charity_id {csv_id!r}, skipping")
                stats["junk"] += 1
                continue

            message_text = (row.get("message") or "").strip()
            donor_email = (row.get("donor_email") or "").strip()
            status = STATUS_MAP.get((row.get("status") or "").strip().lower(), "confirmed")
            created_ts = self._parse_dt(row.get("created_at"))
            updated_ts = self._parse_dt(row.get("updated_at")) or created_ts

            # Match seeded rows whether still at full amount or already halved,
            # so re-running with a new fraction heals in place (never duplicates).
            donation = Donation.objects.filter(
                donor_email=donor_email, message=message_text,
                amount__in=[amount, recorded],
            ).first()

            if donation:
                stats["skipped"] += 1
                heal = []
                if donation.campaign_id is None:
                    donation.campaign = campaign
                    heal.append("campaign")
                if donation.amount != recorded:
                    donation.amount = recorded
                    heal.append("amount")
                if heal and not dry_run:
                    donation.save(update_fields=heal)
            else:
                self.stdout.write(f"  + {donor_name} — €{recorded} -> {charity.name}")
                if dry_run:
                    stats["created"] += 1
                else:
                    donation = Donation.objects.create(
                        charity=charity, campaign=campaign,
                        donor_name=donor_name, donor_email=donor_email,
                        amount=recorded, message=message_text,
                        status=status, user=None,
                    )
                    # created_at/updated_at are auto-managed; preserve CSV dates.
                    if created_ts:
                        Donation.objects.filter(pk=donation.pk).update(
                            created_at=created_ts, updated_at=updated_ts,
                        )
                    stats["created"] += 1

            # Mirror the message into the moderatable guestbook (approved).
            if message_text and not dry_run and donation is not None:
                _, made = Message.objects.get_or_create(
                    donation=donation,
                    defaults={
                        "campaign": campaign,
                        "display_name": donor_name,
                        "body": message_text,
                        "moderation_status": Message.APPROVED,
                        "published_at": created_ts or timezone.now(),
                    },
                )
                if made:
                    stats["messages"] += 1
            elif message_text and dry_run:
                stats["messages"] += 1

        if dry_run:
            transaction.set_rollback(True)
        return stats

    # --- helpers ---
    def _upsert_charity(self, info):
        charity, _ = Charity.objects.get_or_create(name=info["name"])
        charity.website = info["website"]
        if not charity.slug:
            charity.slug = self._unique_charity_slug(charity)
        charity.verification_status = Charity.VERIFIED
        if charity.verified_at is None:
            charity.verified_at = timezone.now()
        charity.is_active = True
        charity.save()
        return charity

    def _unique_charity_slug(self, charity):
        base = slugify(charity.name) or "charity"
        slug, n = base, 1
        while Charity.objects.filter(slug=slug).exclude(pk=charity.pk).exists():
            n += 1
            slug = f"{base}-{n}"
        return slug

    def _get_or_create_campaign(self):
        host, _ = User.objects.get_or_create(
            username=HOST_USERNAME,
            defaults={"first_name": "Anna & Alan", "email": ""},
        )
        campaign, _ = Campaign.objects.get_or_create(
            slug=CAMPAIGN_SLUG,
            defaults={
                "owner": host,
                "type": Campaign.WEDDING,
                "title": CAMPAIGN_TITLE,
                "story": CAMPAIGN_STORY,
                "event_date": CAMPAIGN_EVENT_DATE,
                "location": CAMPAIGN_LOCATION,
                "goal_amount": CAMPAIGN_GOAL,
                "currency": "EUR",
                "visibility": Campaign.PUBLIC,
                "status": Campaign.ACTIVE,
            },
        )
        return campaign

    @staticmethod
    def _parse_dt(value):
        value = (value or "").strip()
        if not value:
            return None
        try:
            dt = datetime.fromisoformat(value)
        except ValueError:
            return None
        # CSV timestamps are naive; make them tz-aware (USE_TZ=True).
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_default_timezone())
        return dt
