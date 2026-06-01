"""
Ledger ↔ donation ↔ Stripe checks for Phase 3 money ops.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Iterable

from django.db.models import Sum

from donations.models import Donation, LedgerEntry


@dataclass
class DonationIssue:
    donation_id: int
    code: str
    detail: str


@dataclass
class ReconcileSummary:
    checked: int = 0
    issues: list[DonationIssue] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.issues


def _ledger_sums(donation: Donation) -> tuple[Decimal, Decimal]:
    qs = LedgerEntry.objects.filter(donation=donation)
    charity = qs.filter(entry_type=LedgerEntry.DONATION_RECEIVED).aggregate(
        total=Sum("amount")
    )["total"] or Decimal("0")
    platform = qs.filter(entry_type=LedgerEntry.PLATFORM_FEE).aggregate(
        total=Sum("amount")
    )["total"] or Decimal("0")
    return charity, platform


def check_donation_ledger(donation: Donation) -> list[DonationIssue]:
    """Internal consistency: confirmed donations must match ledger rows."""
    issues: list[DonationIssue] = []
    if donation.status != "confirmed":
        return issues

    charity_amt, platform_amt = _ledger_sums(donation)
    if charity_amt == 0 and platform_amt == 0:
        issues.append(
            DonationIssue(
                donation.id,
                "missing_ledger",
                "confirmed but no LedgerEntry rows (use webhook path, not admin confirm)",
            )
        )
        return issues

    entry_count = LedgerEntry.objects.filter(donation=donation).count()
    if entry_count > 2:
        issues.append(
            DonationIssue(
                donation.id,
                "duplicate_ledger",
                f"expected ≤2 ledger rows, found {entry_count}",
            )
        )

    net = donation.net_amount
    if net is not None and charity_amt != net:
        issues.append(
            DonationIssue(
                donation.id,
                "ledger_net_mismatch",
                f"charity ledger {charity_amt} != donation.net_amount {net}",
            )
        )

    fee = donation.platform_fee or Decimal("0")
    if platform_amt != fee:
        issues.append(
            DonationIssue(
                donation.id,
                "ledger_fee_mismatch",
                f"platform ledger {platform_amt} != donation.platform_fee {fee}",
            )
        )

    if net is not None:
        total = (charity_amt + platform_amt).quantize(Decimal("0.01"))
        gross = Decimal(donation.amount).quantize(Decimal("0.01"))
        if total != gross:
            issues.append(
                DonationIssue(
                    donation.id,
                    "ledger_gross_mismatch",
                    f"ledger sum {total} != donation.amount {gross}",
                )
            )

    return issues


def check_donation_stripe(
    donation: Donation, stripe_amount: Decimal | None
) -> list[DonationIssue]:
    if stripe_amount is None:
        return []
    if not donation.stripe_payment_intent_id:
        return [
            DonationIssue(
                donation.id,
                "missing_pi",
                "confirmed without stripe_payment_intent_id",
            )
        ]
    gross = Decimal(donation.amount).quantize(Decimal("0.01"))
    if stripe_amount.quantize(Decimal("0.01")) != gross:
        return [
            DonationIssue(
                donation.id,
                "stripe_amount_mismatch",
                f"Stripe PI amount {stripe_amount} != donation.amount {gross}",
            )
        ]
    return []


def is_stripe_era_donation(donation: Donation) -> bool:
    """Stripe/webhook path — exclude CSV-imported confirmed rows with no PI."""
    if donation.stripe_payment_intent_id:
        return True
    return LedgerEntry.objects.filter(donation=donation).exists()


def reconcile_donations(
    donations: Iterable[Donation],
    *,
    fetch_stripe,
    stripe_client,
    include_legacy: bool = False,
) -> ReconcileSummary:
    summary = ReconcileSummary()
    for donation in donations:
        if not include_legacy and not is_stripe_era_donation(donation):
            continue
        summary.checked += 1
        summary.issues.extend(check_donation_ledger(donation))
        if not fetch_stripe or not stripe_client:
            continue
        pi_id = donation.stripe_payment_intent_id or ""
        if not pi_id or pi_id.startswith("pi_smoke_"):
            continue
        try:
            pi = stripe_client.PaymentIntent.retrieve(pi_id)
            minor = pi.get("amount") if hasattr(pi, "get") else getattr(pi, "amount", None)
            if minor is None:
                from payments.services import _stripe_value

                minor = _stripe_value(pi, "amount")
            stripe_amount = (Decimal(minor) / Decimal(100)).quantize(Decimal("0.01"))
        except Exception as exc:  # noqa: BLE001
            summary.issues.append(
                DonationIssue(
                    donation.id,
                    "stripe_fetch_failed",
                    str(exc),
                )
            )
            continue
        summary.issues.extend(check_donation_stripe(donation, stripe_amount))
    return summary
