"""
Payment tests — the highest-risk surface. Stripe is mocked (no network); we
assert the invariants that protect money:
  - webhook signature is required
  - webhook processing is idempotent (replay -> no duplicate ledger entries)
  - a completed checkout confirms the donation, writes the ledger, enqueues outbox
  - the outbox drain issues exactly one receipt
"""
from datetime import date
from decimal import Decimal
from unittest import mock

from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient

from campaigns.models import Campaign
from core.models import OutboxEvent
from donations.models import Charity, Donation, LedgerEntry, PayoutAccount, Receipt
from payments.models import WebhookEvent
from payments import webhooks as webhooks_module


def _make_donation():
    charity = Charity.objects.create(
        name="C", slug="c", verification_status=Charity.VERIFIED,
    )
    PayoutAccount.objects.create(
        charity=charity, stripe_account_id="acct_test", charges_enabled=True,
    )
    host = User.objects.create_user(username="h", password="x")
    campaign = Campaign.objects.create(
        owner=host, type=Campaign.WEDDING, title="T", slug="t",
        visibility=Campaign.PUBLIC, status=Campaign.ACTIVE, event_date=date(2025, 4, 26),
    )
    return Donation.objects.create(
        charity=charity, campaign=campaign, donor_name="Jane",
        donor_email="jane@example.com", amount=Decimal("100"), status="pending",
    )


def _fake_event(donation_id, event_id="evt_1"):
    return {
        "id": event_id,
        "type": "checkout.session.completed",
        "data": {"object": {
            "metadata": {"donation_id": str(donation_id)},
            "currency": "eur",
            "payment_intent": "pi_test_123",
        }},
    }


class WebhookSecurityTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_missing_signature_rejected(self):
        with self.settings(STRIPE_WEBHOOK_SECRET="whsec_test"):
            resp = self.client.post(
                "/api/payments/webhook/", data=b"{}", content_type="application/json"
            )
        self.assertIn(resp.status_code, (400, 500))
        self.assertEqual(Donation.objects.count(), 0)


class WebhookProcessingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.donation = _make_donation()

    def _post_event(self, event):
        # Bypass real signature verification; assert our own logic. The webhook
        # accesses event["id"], event["type"], event["data"], event.to_dict().
        fake = mock.MagicMock()
        fake.__getitem__.side_effect = event.__getitem__
        fake.to_dict.return_value = {"id": event["id"]}
        with self.settings(STRIPE_WEBHOOK_SECRET="whsec_test"), \
             mock.patch.object(webhooks_module.stripe.Webhook, "construct_event", return_value=fake):
            return self.client.post(
                "/api/payments/webhook/", data=b"{}", content_type="application/json",
                HTTP_STRIPE_SIGNATURE="t=1,v1=fake",
            )

    def test_checkout_completed_confirms_and_writes_ledger(self):
        resp = self._post_event(_fake_event(self.donation.id))
        self.assertEqual(resp.status_code, 200, resp.content)
        self.donation.refresh_from_db()
        self.assertEqual(self.donation.status, "confirmed")
        self.assertEqual(self.donation.stripe_payment_intent_id, "pi_test_123")
        entries = LedgerEntry.objects.filter(donation=self.donation)
        self.assertEqual(entries.count(), 1)  # fee 0 -> single CHARITY entry
        self.assertEqual(entries.first().account, LedgerEntry.CHARITY)
        self.assertEqual(entries.first().amount, Decimal("100.00"))
        self.assertEqual(
            OutboxEvent.objects.filter(event_type="donation.confirmed").count(), 1
        )

    def test_webhook_is_idempotent_on_replay(self):
        ev = _fake_event(self.donation.id, event_id="evt_dup")
        self._post_event(ev)
        resp2 = self._post_event(ev)  # replay SAME event id
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(LedgerEntry.objects.filter(donation=self.donation).count(), 1)
        self.assertEqual(WebhookEvent.objects.filter(stripe_event_id="evt_dup").count(), 1)
        self.assertEqual(OutboxEvent.objects.count(), 1)

    def test_distinct_events_same_donation_guarded(self):
        self._post_event(_fake_event(self.donation.id, event_id="evt_a"))
        self._post_event(_fake_event(self.donation.id, event_id="evt_b"))
        # donation-level "already confirmed" guard prevents a second ledger write
        self.assertEqual(LedgerEntry.objects.filter(donation=self.donation).count(), 1)


class OutboxDrainTests(TestCase):
    def test_drain_issues_one_receipt(self):
        donation = _make_donation()
        donation.status = "confirmed"
        donation.net_amount = Decimal("100")
        donation.save()
        OutboxEvent.objects.create(
            event_type="donation.confirmed", payload={"donation_id": donation.id}
        )
        from django.core.management import call_command
        with mock.patch("donations.helpers.send_donation_confirmation_email"):
            call_command("drain_outbox")
            call_command("drain_outbox")  # second run must not duplicate
        self.assertEqual(Receipt.objects.filter(donation=donation).count(), 1)
        self.assertEqual(OutboxEvent.objects.filter(status=OutboxEvent.DONE).count(), 1)
