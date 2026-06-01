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
from payments import services
from payments import webhooks as webhooks_module
from payments.reconciliation import check_donation_ledger, reconcile_donations


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


def _fake_event(donation_id, event_id="evt_1", payment_status="paid"):
    return {
        "id": event_id,
        "type": "checkout.session.completed",
        "data": {"object": {
            "metadata": {"donation_id": str(donation_id)},
            "currency": "eur",
            "payment_intent": "pi_test_123",
            "payment_status": payment_status,
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

    @mock.patch("payments.webhooks._platform_fee_from_stripe", return_value=Decimal("0"))
    def test_checkout_completed_confirms_and_writes_ledger(self, _fee):
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

    @mock.patch("payments.webhooks._platform_fee_from_stripe", return_value=Decimal("0"))
    def test_webhook_is_idempotent_on_replay(self, _fee):
        ev = _fake_event(self.donation.id, event_id="evt_dup")
        self._post_event(ev)
        resp2 = self._post_event(ev)  # replay SAME event id
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(LedgerEntry.objects.filter(donation=self.donation).count(), 1)
        self.assertEqual(WebhookEvent.objects.filter(stripe_event_id="evt_dup").count(), 1)
        self.assertEqual(OutboxEvent.objects.count(), 1)

    @mock.patch("payments.webhooks._platform_fee_from_stripe", return_value=Decimal("0"))
    def test_distinct_events_same_donation_guarded(self, _fee):
        self._post_event(_fake_event(self.donation.id, event_id="evt_a"))
        self._post_event(_fake_event(self.donation.id, event_id="evt_b"))
        # donation-level "already confirmed" guard prevents a second ledger write
        self.assertEqual(LedgerEntry.objects.filter(donation=self.donation).count(), 1)

    @mock.patch("payments.webhooks._platform_fee_from_stripe", return_value=Decimal("0"))
    def test_checkout_unpaid_does_not_confirm(self, _fee):
        self._post_event(_fake_event(self.donation.id, payment_status="unpaid"))
        self.donation.refresh_from_db()
        self.assertEqual(self.donation.status, "pending")
        self.assertEqual(LedgerEntry.objects.filter(donation=self.donation).count(), 0)


class SmokeDonateFlowTests(TestCase):
    """Phase 0: donation confirm path without Stripe network."""

    def test_smoke_donate_flow_command(self):
        from django.core.management import call_command
        from io import StringIO
        call_command("import_donations", csv="../love_frontend/public/data/donations.csv", stdout=StringIO())
        out = StringIO()
        with mock.patch("donations.helpers.send_donation_confirmation_email"):
            call_command("smoke_donate_flow", "--drain", stdout=out)
        self.assertIn("Phase 0 smoke OK", out.getvalue())
        self.assertTrue(Donation.objects.filter(status="confirmed").exists())
        self.assertTrue(Receipt.objects.filter(donation__donor_email="smoke@example.com").exists())


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


class PayoutValidationTests(TestCase):
    def test_resolve_payout_reads_stripe_account_object(self):
        """Account.retrieve returns StripeObject, not dict — must not call .get()."""
        charity = Charity.objects.create(
            name="Y", slug="y", verification_status=Charity.VERIFIED,
        )
        PayoutAccount.objects.create(
            charity=charity, stripe_account_id="acct_test123", charges_enabled=True,
        )

        class FakeAccount:
            charges_enabled = True

        with mock.patch("payments.services._client") as client:
            client.return_value.Account.retrieve.return_value = FakeAccount()
            payout = services._resolve_payout_for_checkout(charity)
        self.assertEqual(payout.stripe_account_id, "acct_test123")

    def test_placeholder_account_rejected(self):
        charity = Charity.objects.create(
            name="X", slug="x", verification_status=Charity.VERIFIED,
        )
        PayoutAccount.objects.create(
            charity=charity, stripe_account_id="acct_smoke_test", charges_enabled=True,
        )
        with self.assertRaises(ValueError) as ctx:
            services._resolve_payout_for_checkout(charity)
        self.assertIn("placeholder", str(ctx.exception).lower())


class CheckoutAuthorizationTests(TestCase):
    """POST /checkout/ must not honour a caller-supplied donation id (an IDOR that
    leaks the donor's email via the prefilled Stripe page) and must reject bad
    amounts before any donation is created."""

    def setUp(self):
        self.client = APIClient()
        self.charity = Charity.objects.create(
            name="C", slug="c", verification_status=Charity.VERIFIED,
        )
        PayoutAccount.objects.create(
            charity=self.charity, stripe_account_id="acct_test", charges_enabled=True,
        )
        host = User.objects.create_user(username="h2", password="x")
        self.campaign = Campaign.objects.create(
            owner=host, type=Campaign.WEDDING, title="T2", slug="t2",
            visibility=Campaign.PUBLIC, status=Campaign.ACTIVE, event_date=date(2025, 4, 26),
        )

    def _checkout_headers(self):
        from django.conf import settings
        origin = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        return {"HTTP_ORIGIN": origin}

    def _payload(self, **over):
        data = {
            "charity": self.charity.id,
            "campaign": self.campaign.slug,
            "donor_name": "Attacker",
            "donor_email": "attacker@example.com",
            "amount": "25",
        }
        data.update(over)
        return data

    def _post_checkout(self, data):
        return self.client.post(
            "/api/payments/checkout/",
            data=data,
            format="json",
            **self._checkout_headers(),
        )

    def _victim(self):
        return Donation.objects.create(
            charity=self.charity, donor_name="Victim",
            donor_email="victim@example.com", amount=Decimal("50"), status="pending",
        )

    @mock.patch("payments.services.create_checkout_session", return_value="https://stripe.test/cs")
    def test_donation_id_alone_buys_nothing(self, create_session):
        """An id with no charity (the IDOR payload) must never reach Stripe."""
        victim = self._victim()
        resp = self._post_checkout({"donation_id": victim.id, "amount": "25", "charity": self.charity.id})
        self.assertIn(resp.status_code, (400, 404))
        create_session.assert_not_called()
        victim.refresh_from_db()
        self.assertEqual(victim.status, "pending")  # untouched

    @mock.patch("payments.services.create_checkout_session", return_value="https://stripe.test/cs")
    def test_smuggled_donation_id_is_ignored_fresh_donation_created(self, create_session):
        """A smuggled id is ignored: a new donation is created for the caller and
        the victim's donation (and email) is never used for the session."""
        victim = self._victim()
        resp = self._post_checkout(self._payload(donation_id=victim.id))
        self.assertEqual(resp.status_code, 200, resp.content)
        create_session.assert_called_once()
        used = create_session.call_args.args[0]
        self.assertNotEqual(used.id, victim.id)
        self.assertEqual(used.donor_email, "attacker@example.com")
        self.assertEqual(resp.json()["donation_id"], used.id)

    @mock.patch("payments.services.create_checkout_session", return_value="https://stripe.test/cs")
    def test_nonpositive_or_invalid_amount_rejected(self, create_session):
        for bad in ("0", "-5", "", "abc"):
            resp = self._post_checkout(self._payload(amount=bad))
            self.assertEqual(resp.status_code, 400, f"amount={bad!r}")
        create_session.assert_not_called()
        self.assertEqual(Donation.objects.count(), 0)  # nothing persisted on bad input

    @mock.patch("payments.services.create_checkout_session", return_value="https://stripe.test/cs")
    def test_checkout_requires_campaign(self, create_session):
        resp = self._post_checkout({
            "charity": self.charity.id,
            "donor_name": "A",
            "donor_email": "a@example.com",
            "amount": "10",
        })
        self.assertEqual(resp.status_code, 400)
        create_session.assert_not_called()

    @mock.patch("payments.services.create_checkout_session", return_value="https://stripe.test/cs")
    def test_checkout_rejects_empty_email(self, create_session):
        resp = self._post_checkout(self._payload(donor_email=""))
        self.assertEqual(resp.status_code, 400)
        create_session.assert_not_called()


class ReconciliationTests(TestCase):
    def test_confirmed_without_ledger_flags_issue(self):
        donation = _make_donation()
        donation.status = "confirmed"
        donation.net_amount = donation.amount
        donation.save()
        issues = check_donation_ledger(donation)
        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0].code, "missing_ledger")

    def test_ledger_matches_after_webhook(self):
        donation = _make_donation()
        webhooks_module._confirm_donation(
            donation,
            {"metadata": {"donation_id": str(donation.id)}, "currency": "eur", "payment_intent": "pi_x"},
        )
        donation.refresh_from_db()
        self.assertEqual(check_donation_ledger(donation), [])

    def test_legacy_import_skipped_by_default(self):
        donation = _make_donation()
        donation.status = "confirmed"
        donation.save()
        summary = reconcile_donations([donation], fetch_stripe=False, stripe_client=None)
        self.assertEqual(summary.checked, 0)

    @mock.patch("stripe.PaymentIntent.retrieve")
    def test_stripe_amount_mismatch_detected(self, retrieve):
        donation = _make_donation()
        webhooks_module._confirm_donation(
            donation,
            {"metadata": {"donation_id": str(donation.id)}, "currency": "eur", "payment_intent": "pi_live"},
        )
        donation.refresh_from_db()
        donation.stripe_payment_intent_id = "pi_live"
        donation.save(update_fields=["stripe_payment_intent_id"])
        retrieve.return_value = {"amount": 5000}  # €50 vs €100
        mock_stripe = mock.Mock()
        mock_stripe.PaymentIntent.retrieve = retrieve
        summary = reconcile_donations([donation], fetch_stripe=True, stripe_client=mock_stripe)
        codes = [i.code for i in summary.issues]
        self.assertIn("stripe_amount_mismatch", codes)
