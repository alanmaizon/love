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
from messaging.models import Message
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

    @mock.patch("payments.webhooks._platform_fee_from_stripe", return_value=Decimal("0"))
    def test_checkout_creates_pending_guestbook_message(self, _fee):
        self.donation.message = "So happy for you both!"
        self.donation.save(update_fields=["message"])
        self._post_event(_fake_event(self.donation.id))
        msg = Message.objects.get(donation=self.donation)
        self.assertEqual(msg.body, "So happy for you both!")
        self.assertEqual(msg.moderation_status, Message.PENDING)
        self.assertEqual(msg.display_name, "Jane")

    @mock.patch("payments.webhooks._platform_fee_from_stripe", return_value=Decimal("0"))
    def test_checkout_skips_guestbook_when_message_empty(self, _fee):
        self.donation.message = "   "
        self.donation.save(update_fields=["message"])
        self._post_event(_fake_event(self.donation.id))
        self.assertFalse(Message.objects.filter(donation=self.donation).exists())

    @mock.patch("payments.webhooks._platform_fee_from_stripe", return_value=Decimal("0"))
    def test_checkout_guestbook_anonymous_display_name(self, _fee):
        self.donation.message = "Congrats"
        self.donation.is_anonymous = True
        self.donation.save(update_fields=["message", "is_anonymous"])
        self._post_event(_fake_event(self.donation.id))
        msg = Message.objects.get(donation=self.donation)
        self.assertEqual(msg.display_name, "Anonymous")
        self.assertTrue(msg.is_anonymous)


class GuestbookWebhookIntegrationTests(TestCase):
    """Webhook → host guestbook → public messages after approve."""

    def setUp(self):
        self.client = APIClient()
        self.host = User.objects.create_user(username="ghost", password="x")
        charity = Charity.objects.create(
            name="C", slug="c-gb", verification_status=Charity.VERIFIED,
        )
        PayoutAccount.objects.create(
            charity=charity, stripe_account_id="acct_gb", charges_enabled=True,
        )
        self.campaign = Campaign.objects.create(
            owner=self.host, type=Campaign.WEDDING, title="GB", slug="gb-camp",
            visibility=Campaign.PUBLIC, status=Campaign.ACTIVE, event_date=date(2025, 4, 26),
        )
        from campaigns.models import CampaignBeneficiary
        CampaignBeneficiary.objects.create(
            campaign=self.campaign, charity=charity, split_percent=100,
        )
        self.donation = Donation.objects.create(
            charity=charity, campaign=self.campaign, donor_name="Guest",
            donor_email="g@example.com", amount=Decimal("25"), message="Lovely day!",
            status="pending",
        )

    def _confirm_via_webhook(self):
        fake = mock.MagicMock()
        ev = _fake_event(self.donation.id)
        fake.__getitem__.side_effect = ev.__getitem__
        fake.to_dict.return_value = {"id": ev["id"]}
        with self.settings(STRIPE_WEBHOOK_SECRET="whsec_test"), \
             mock.patch.object(webhooks_module.stripe.Webhook, "construct_event", return_value=fake), \
             mock.patch("payments.webhooks._platform_fee_from_stripe", return_value=Decimal("0")):
            return self.client.post(
                "/api/payments/webhook/", data=b"{}", content_type="application/json",
                HTTP_STRIPE_SIGNATURE="t=1,v1=fake",
            )

    def test_webhook_to_public_guestbook_after_host_approves(self):
        self.assertEqual(self._confirm_via_webhook().status_code, 200)
        slug = self.campaign.slug
        self.assertEqual(len(self.client.get(f"/api/messages/?campaign={slug}").json()), 0)

        self.client.force_authenticate(self.host)
        guestbook = self.client.get(f"/api/campaigns/{slug}/guestbook/").json()
        self.assertEqual(len(guestbook), 1)
        self.assertEqual(guestbook[0]["moderation_status"], "pending")
        self.assertEqual(guestbook[0]["body"], "Lovely day!")

        mid = guestbook[0]["id"]
        self.client.patch(
            f"/api/campaigns/{slug}/moderate/",
            {"message_id": mid, "action": "approve"},
            format="json",
        )
        public = self.client.get(f"/api/messages/?campaign={slug}").json()
        self.assertEqual(len(public), 1)
        self.assertEqual(public[0]["body"], "Lovely day!")


class FullGuestbookFlowTests(TestCase):
    """Checkout POST → webhook → host guestbook → public messages (API contract)."""

    def setUp(self):
        self.client = APIClient()
        self.host = User.objects.create_user(username="flowhost", password="x")
        self.charity = Charity.objects.create(
            name="Flow", slug="flow-c", verification_status=Charity.VERIFIED,
        )
        PayoutAccount.objects.create(
            charity=self.charity, stripe_account_id="acct_flow", charges_enabled=True,
        )
        self.campaign = Campaign.objects.create(
            owner=self.host, type=Campaign.WEDDING, title="Flow Camp", slug="flow-camp",
            visibility=Campaign.PUBLIC, status=Campaign.ACTIVE, event_date=date(2025, 6, 1),
        )
        from campaigns.models import CampaignBeneficiary
        CampaignBeneficiary.objects.create(
            campaign=self.campaign, charity=self.charity, split_percent=100,
        )
        from django.conf import settings
        self.origin = getattr(settings, "FRONTEND_URL", "http://localhost:5173")

    @mock.patch("payments.views.services.create_checkout_session", return_value="https://stripe.test/cs_flow")
    def test_checkout_message_surfaces_after_webhook_and_approve(self, _checkout):
        resp = self.client.post(
            "/api/payments/checkout/",
            {
                "charity": self.charity.id,
                "campaign": self.campaign.slug,
                "donor_name": "Sam",
                "donor_email": "sam@example.com",
                "amount": "30",
                "message": "So grateful for you!",
            },
            format="json",
            HTTP_ORIGIN=self.origin,
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        donation_id = resp.json()["donation_id"]
        donation = Donation.objects.get(id=donation_id)
        self.assertEqual(donation.message, "So grateful for you!")
        self.assertFalse(Message.objects.filter(donation=donation).exists())

        fake = mock.MagicMock()
        ev = _fake_event(donation_id, event_id="evt_flow")
        fake.__getitem__.side_effect = ev.__getitem__
        fake.to_dict.return_value = {"id": ev["id"]}
        with self.settings(STRIPE_WEBHOOK_SECRET="whsec_test"), \
             mock.patch.object(webhooks_module.stripe.Webhook, "construct_event", return_value=fake), \
             mock.patch("payments.webhooks._platform_fee_from_stripe", return_value=Decimal("0")):
            wh = self.client.post(
                "/api/payments/webhook/", data=b"{}", content_type="application/json",
                HTTP_STRIPE_SIGNATURE="t=1,v1=fake",
            )
        self.assertEqual(wh.status_code, 200)

        slug = self.campaign.slug
        msg = Message.objects.get(donation=donation)
        self.assertEqual(msg.moderation_status, Message.PENDING)
        self.assertEqual(len(self.client.get(f"/api/messages/?campaign={slug}").json()), 0)

        self.client.force_authenticate(self.host)
        pending = self.client.get(f"/api/campaigns/{slug}/guestbook/").json()
        self.assertEqual(pending[0]["body"], "So grateful for you!")
        self.client.patch(
            f"/api/campaigns/{slug}/moderate/",
            {"message_id": pending[0]["id"], "action": "approve"},
            format="json",
        )
        public = self.client.get(f"/api/messages/?campaign={slug}").json()
        self.assertEqual(public[0]["display_name"], "Sam")
        self.assertEqual(public[0]["body"], "So grateful for you!")


class SyncCheckoutGuestbookTests(TestCase):
    """DEBUG sync-checkout path also creates guestbook rows."""

    def setUp(self):
        self.client = APIClient()
        charity = Charity.objects.create(
            name="Sync", slug="sync-c", verification_status=Charity.VERIFIED,
        )
        PayoutAccount.objects.create(
            charity=charity, stripe_account_id="acct_sync", charges_enabled=True,
        )
        host = User.objects.create_user(username="shost", password="x")
        self.campaign = Campaign.objects.create(
            owner=host, type=Campaign.WEDDING, title="S", slug="sync-camp",
            visibility=Campaign.PUBLIC, status=Campaign.ACTIVE, event_date=date(2025, 6, 1),
        )
        from campaigns.models import CampaignBeneficiary
        CampaignBeneficiary.objects.create(
            campaign=self.campaign, charity=charity, split_percent=100,
        )
        self.donation = Donation.objects.create(
            charity=charity, campaign=self.campaign, donor_name="Sync Guest",
            donor_email="sync@example.com", amount=Decimal("15"),
            message="Sync path says hi", status="pending",
        )
        from django.conf import settings
        self.origin = getattr(settings, "FRONTEND_URL", "http://localhost:5173")

    @mock.patch("payments.views.services._client")
    def test_sync_checkout_confirms_and_creates_message(self, client_factory):
        session = {
            "metadata": {"donation_id": str(self.donation.id)},
            "currency": "eur",
            "payment_intent": "pi_sync_1",
            "payment_status": "paid",
        }
        mock_session = mock.MagicMock()
        mock_session.to_dict.return_value = session
        client_factory.return_value.checkout.Session.retrieve.return_value = mock_session

        with self.settings(DEBUG=True, STRIPE_SECRET_KEY="sk_test"):
            resp = self.client.post(
                "/api/payments/sync-checkout/",
                {"session_id": "cs_sync_test_123"},
                format="json",
                HTTP_ORIGIN=self.origin,
            )
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.json()["status"], "confirmed")
        msg = Message.objects.get(donation=self.donation)
        self.assertEqual(msg.body, "Sync path says hi")
        self.assertEqual(msg.moderation_status, Message.PENDING)


class E2EConfirmDonationTests(TestCase):
    """Test-only confirm-by-id hook used by the decoupled CI E2E (no Stripe UI)."""

    def setUp(self):
        self.client = APIClient()
        charity = Charity.objects.create(
            name="E2E", slug="e2e-c", verification_status=Charity.VERIFIED,
        )
        PayoutAccount.objects.create(
            charity=charity, stripe_account_id="acct_e2e", charges_enabled=True,
        )
        host = User.objects.create_user(username="e2ehost", password="x")
        self.campaign = Campaign.objects.create(
            owner=host, type=Campaign.WEDDING, title="E", slug="e2e-camp",
            visibility=Campaign.PUBLIC, status=Campaign.ACTIVE, event_date=date(2025, 6, 1),
        )
        from campaigns.models import CampaignBeneficiary
        CampaignBeneficiary.objects.create(
            campaign=self.campaign, charity=charity, split_percent=100,
        )
        self.donation = Donation.objects.create(
            charity=charity, campaign=self.campaign, donor_name="E2E Guest",
            donor_email="e2e@example.com", amount=Decimal("20"),
            message="E2E hook says hi", status="pending",
        )
        from django.conf import settings
        self.origin = getattr(settings, "FRONTEND_URL", "http://localhost:5173")

    def _post(self):
        return self.client.post(
            "/api/payments/e2e-confirm/",
            {"donation_id": self.donation.id},
            format="json",
            HTTP_ORIGIN=self.origin,
        )

    def test_unavailable_without_test_hooks(self):
        with self.settings(DEBUG=True, E2E_TEST_HOOKS=False):
            self.assertEqual(self._post().status_code, 404)

    def test_unavailable_when_not_debug(self):
        with self.settings(DEBUG=False, E2E_TEST_HOOKS=True):
            self.assertEqual(self._post().status_code, 404)

    def test_confirms_and_creates_pending_message(self):
        with self.settings(DEBUG=True, E2E_TEST_HOOKS=True, STRIPE_SECRET_KEY=""):
            resp = self._post()
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.json()["status"], "confirmed")
        self.donation.refresh_from_db()
        self.assertEqual(self.donation.status, "confirmed")
        self.assertTrue(LedgerEntry.objects.filter(donation=self.donation).exists())
        msg = Message.objects.get(donation=self.donation)
        self.assertEqual(msg.body, "E2E hook says hi")
        self.assertEqual(msg.moderation_status, Message.PENDING)


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
        smoke_donation = Donation.objects.get(donor_email="smoke@example.com", status="confirmed")
        msg = Message.objects.get(donation=smoke_donation)
        self.assertEqual(msg.body, "Phase 0 smoke")
        self.assertEqual(msg.moderation_status, Message.PENDING)


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


class CheckoutIdempotencyKeyTests(TestCase):
    def setUp(self):
        charity = Charity.objects.create(
            name="C", slug="c-idem", verification_status=Charity.VERIFIED,
        )
        self.donation = Donation.objects.create(
            charity=charity,
            donor_name="D",
            donor_email="d@example.com",
            amount=Decimal("20.00"),
            message="hi",
        )

    def _key(self, **overrides):
        defaults = dict(
            donation=self.donation,
            amount_minor=2000,
            currency="eur",
            destination="acct_test",
            fee_minor=0,
            locale="en",
            success_url="http://localhost:5173/confirmation?session_id={CHECKOUT_SESSION_ID}",
            cancel_url="http://localhost:5173/donate?canceled=1",
        )
        defaults.update(overrides)
        return services._checkout_idempotency_key(**defaults)

    def test_same_params_same_key(self):
        self.assertEqual(self._key(), self._key())

    def test_locale_change_changes_key(self):
        self.assertNotEqual(self._key(locale="en"), self._key(locale="es"))

    def test_different_donation_rows_differ_even_if_pk_reused(self):
        other = Donation.objects.create(
            charity=self.donation.charity,
            donor_name="D2",
            donor_email="d2@example.com",
            amount=Decimal("20.00"),
        )
        self.assertNotEqual(
            self._key(donation=self.donation),
            self._key(donation=other),
        )


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
