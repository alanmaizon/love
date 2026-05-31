# donations/tests.py
from datetime import date
from decimal import Decimal

from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User
from .models import Donation, Charity
from campaigns.models import Campaign
from messaging.models import Message
from accounts.models import OrgMembership

# -------------------------
# Login Endpoint Tests
# -------------------------
class LoginViewTest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        # Create a test user for login tests.
        self.test_username = "testuser"
        self.test_password = "testpass123"
        User.objects.create_user(username=self.test_username, password=self.test_password)
        self.login_url = reverse("login")  # using the URL name defined in urls.py

    def test_login_success(self):
        response = self.client.post(
            self.login_url,
            data={"username": self.test_username, "password": self.test_password},
            format="json"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("message", data)
        self.assertEqual(data["message"], "Login successful")

    def test_login_failure_wrong_credentials(self):
        response = self.client.post(
            self.login_url,
            data={"username": self.test_username, "password": "wrongpassword"},
            format="json"
        )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("error", data)

    def test_login_invalid_method(self):
        response = self.client.get(self.login_url)
        self.assertEqual(response.status_code, 405)

# -------------------------
# Donation Endpoint Tests
# -------------------------
class DonationTests(APITestCase):
    """
    Security model (v2): /api/donations/ is admin-only. Public giving uses
    POST /api/payments/checkout/ (Stripe).
    """
    def setUp(self):
        self.client = APIClient()
        # Create a charity to use as a foreign key in donations.
        self.charity = Charity.objects.create(name="Test Charity", description="A charity for testing.")
        # Staff user for privileged (write) operations.
        self.admin = User.objects.create_user(
            username="admin", password="adminpass123", is_staff=True
        )
        # Use the literal paths (adjust if you have a different URL prefix).
        self.donation_list_url = "/api/donations/"

    def _make_donation(self):
        """Helper: create a donation as admin and return its id."""
        self.client.force_authenticate(user=self.admin)
        data = {
            "donor_name": "John Doe",
            "donor_email": "john@example.com",
            "amount": 50,
            "message": "Seed donation",
            "charity": self.charity.id,
        }
        resp = self.client.post(self.donation_list_url, data=data, format="json")
        self.assertEqual(resp.status_code, 201)
        return resp.json()["id"]

    def test_get_donations_denied_for_anonymous(self):
        response = self.client.get(self.donation_list_url, format="json")
        self.assertEqual(response.status_code, 403)

    def test_get_empty_donations_list_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(self.donation_list_url, format="json")
        self.assertEqual(response.status_code, 200)
        rows = response.json()
        rows = rows["results"] if isinstance(rows, dict) else rows
        self.assertEqual(len(rows), 0)

    def test_create_donation_denied_for_anonymous(self):
        data = {
            "donor_name": "John Doe",
            "donor_email": "john@example.com",
            "amount": 50,
            "message": "Great cause!",
            "charity": self.charity.id,
        }
        response = self.client.post(self.donation_list_url, data=data, format="json")
        self.assertEqual(response.status_code, 403)

    def test_create_donation_success_admin(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            "donor_name": "John Doe",
            "donor_email": "john@example.com",
            "amount": 50,
            "message": "Great cause!",
            "charity": self.charity.id,
        }
        response = self.client.post(self.donation_list_url, data=data, format="json")
        self.assertEqual(response.status_code, 201)
        result = response.json()
        self.assertEqual(result["donor_name"], "John Doe")
        self.assertEqual(float(result["amount"]), 50.0)

    def test_update_donation_denied_for_anonymous(self):
        donation_id = self._make_donation()
        self.client.force_authenticate(user=None)
        url = f"/api/donations/{donation_id}/"
        resp = self.client.put(url, data={
            "donor_name": "Jane Doe", "donor_email": "jane@example.com",
            "amount": 75, "message": "Updated", "charity": self.charity.id,
        }, format="json")
        # Anonymous users must not mutate donations.
        self.assertEqual(resp.status_code, 403)

    def test_update_donation_allowed_for_admin(self):
        donation_id = self._make_donation()
        url = f"/api/donations/{donation_id}/"
        self.client.force_authenticate(user=self.admin)
        resp = self.client.put(url, data={
            "donor_name": "Jane Doe", "donor_email": "jane@example.com",
            "amount": 75, "message": "Updated", "charity": self.charity.id,
        }, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["donor_name"], "Jane Doe")

    def test_delete_donation_denied_for_anonymous(self):
        donation_id = self._make_donation()
        self.client.force_authenticate(user=None)
        resp = self.client.delete(f"/api/donations/{donation_id}/")
        self.assertEqual(resp.status_code, 403)

    def test_delete_donation_allowed_for_admin(self):
        donation_id = self._make_donation()
        self.client.force_authenticate(user=self.admin)
        resp = self.client.delete(f"/api/donations/{donation_id}/")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(Donation.objects.filter(id=donation_id).exists())

    def test_confirm_donation_denied_for_anonymous(self):
        donation_id = self._make_donation()
        self.client.force_authenticate(user=None)
        resp = self.client.patch(f"/api/donations/{donation_id}/confirm/", data={}, format="json")
        self.assertEqual(resp.status_code, 403)

    def test_confirm_donation_action_admin(self):
        donation_id = self._make_donation()
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch(f"/api/donations/{donation_id}/confirm/", data={}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "confirmed")

    def test_confirm_donation_non_existent(self):
        # Admin auth so we reach the lookup (404), not the permission gate (403).
        self.client.force_authenticate(user=self.admin)
        resp = self.client.patch("/api/donations/9999/confirm/", data={}, format="json")
        self.assertEqual(resp.status_code, 404)

# -------------------------
# Charity Endpoint Tests
# -------------------------
class CharityTests(APITestCase):
    """
    Security model (v2): charities are read-only to the public; only staff may
    create/update/delete them. This is the structural defense against charity
    impersonation — anonymous writes MUST be rejected.
    """
    def setUp(self):
        self.client = APIClient()
        self.charity_list_url = "/api/charities/"
        self.admin = User.objects.create_user(
            username="admin", password="adminpass123", is_staff=True
        )

    def test_get_empty_charities_list(self):
        response = self.client.get(self.charity_list_url, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)

    def test_create_charity_denied_for_anonymous(self):
        resp = self.client.post(
            self.charity_list_url,
            data={"name": "Charity A", "description": "Helping the community"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(Charity.objects.count(), 0)

    def test_create_charity_allowed_for_admin(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post(
            self.charity_list_url,
            data={"name": "Charity A", "description": "Helping the community"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["name"], "Charity A")

    def test_update_charity_admin(self):
        charity = Charity.objects.create(name="Charity A", description="x")
        self.client.force_authenticate(user=self.admin)
        resp = self.client.put(
            f"/api/charities/{charity.id}/",
            data={"name": "Updated Charity", "description": "New description"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["name"], "Updated Charity")

    def test_delete_charity_denied_for_anonymous(self):
        charity = Charity.objects.create(name="Charity A", description="x")
        resp = self.client.delete(f"/api/charities/{charity.id}/")
        self.assertEqual(resp.status_code, 403)
        self.assertTrue(Charity.objects.filter(id=charity.id).exists())

    def test_delete_charity_admin_soft_deactivates(self):
        charity = Charity.objects.create(name="Charity A", description="x", slug="charity-a")
        self.client.force_authenticate(user=self.admin)
        resp = self.client.delete(f"/api/charities/{charity.id}/")
        self.assertEqual(resp.status_code, 204)
        charity.refresh_from_db()
        self.assertFalse(charity.is_active)


# -------------------------
# v2 API surface (CP3)
# -------------------------
class V2ApiTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username="admin", password="adminpass123", is_staff=True
        )
        self.host = User.objects.create_user(username="host", password="x")
        self.charity = Charity.objects.create(
            name="Test Charity", slug="test-charity",
            verification_status=Charity.VERIFIED,
        )
        self.campaign = Campaign.objects.create(
            owner=self.host, type=Campaign.WEDDING, title="Test Wedding",
            slug="test-wedding", visibility=Campaign.PUBLIC, status=Campaign.ACTIVE,
            goal_amount=Decimal("1000"), event_date=date(2025, 4, 26),
        )
        self.donation = Donation.objects.create(
            charity=self.charity, campaign=self.campaign,
            donor_name="Jane", donor_email="jane@example.com",
            amount=Decimal("100"), message="Congrats!", status="confirmed",
        )
        Message.objects.create(
            campaign=self.campaign, donation=self.donation,
            display_name="Jane", body="Congrats!",
            moderation_status=Message.APPROVED,
        )

    def test_public_campaign_default_returns_flagship(self):
        resp = self.client.get("/api/campaign/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["slug"], "test-wedding")
        # Beneficiary charities are embedded.
        self.assertIn("beneficiaries", resp.json())

    def test_public_campaign_by_slug(self):
        resp = self.client.get("/api/campaign/test-wedding/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["title"], "Test Wedding")

    def test_campaign_payload_has_no_owner_pii(self):
        resp = self.client.get("/api/campaign/test-wedding/")
        body = resp.json()
        # Host is exposed only as a friendly display name — never the raw
        # username/email, and never an `owner` object.
        self.assertNotIn("owner", body)
        self.assertNotIn("owner_email", body)
        # The username must not leak in any serialized *value* (key names like
        # "host_display_name" legitimately contain "host", so check values).
        self.assertNotIn(self.host.username, "".join(str(v) for v in body.values()))

    def test_guestbook_returns_approved_only(self):
        # Add a pending message that must NOT appear.
        Message.objects.create(
            campaign=self.campaign, display_name="Spam", body="hidden",
            moderation_status=Message.PENDING,
        )
        resp = self.client.get("/api/messages/?campaign=test-wedding")
        self.assertEqual(resp.status_code, 200)
        bodies = [m["body"] for m in resp.json()]
        self.assertIn("Congrats!", bodies)
        self.assertNotIn("hidden", bodies)

    def test_analytics_is_100_percent_charity(self):
        resp = self.client.get("/api/analytics/")
        body = resp.json()
        # No 50/50 split: charity_amount equals total, no couple_amount key.
        self.assertEqual(float(body["total_amount"]), 100.0)
        self.assertEqual(float(body["charity_amount"]), 100.0)
        self.assertNotIn("couple_amount", body)

    def test_stats_shape(self):
        resp = self.client.get("/api/stats/")
        if resp.status_code != 200 or "trend" not in resp.json():
            with open("/tmp/stats_debug.txt", "w") as fh:
                fh.write(f"status={resp.status_code}\n")
                fh.write(resp.content.decode("utf-8", "replace"))
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(len(body["trend"]), 30)
        self.assertTrue(any(c["charity"] == "Test Charity" for c in body["by_charity"]))

    def test_donation_list_denied_for_anonymous(self):
        resp = self.client.get("/api/donations/")
        self.assertEqual(resp.status_code, 403)

    def test_donation_list_hides_anonymous_donor_pii_even_for_admin(self):
        Donation.objects.filter(id=self.donation.id).update(is_anonymous=True)
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get("/api/donations/")
        rows = resp.json()
        rows = rows["results"] if isinstance(rows, dict) else rows
        row = next(r for r in rows if r["id"] == self.donation.id)
        self.assertEqual(row.get("display_name"), "Anonymous")
        self.assertNotIn("donor_name", row)
        self.assertNotIn("message", row)
        # Staff may see donor_email for receipt/support on confirmed gifts.
        self.assertIn("donor_email", row)

    def test_donation_list_shows_email_to_admin(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.get("/api/donations/")
        rows = resp.json()
        rows = rows["results"] if isinstance(rows, dict) else rows
        self.assertTrue(any("donor_email" in r for r in rows))

    def test_charities_endpoint_no_internal_fields(self):
        resp = self.client.get("/api/charities/")
        rows = resp.json()
        rows = rows["results"] if isinstance(rows, dict) else rows
        for r in rows:
            self.assertNotIn("contact_email", r)
            self.assertNotIn("registration_number", r)


# -------------------------
# Plan C: self-serve onboarding
# -------------------------
@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": [
            "rest_framework.authentication.SessionAuthentication",
        ],
        "DEFAULT_PERMISSION_CLASSES": [
            "rest_framework.permissions.IsAuthenticatedOrReadOnly",
        ],
        "DEFAULT_RENDERER_CLASSES": [
            "rest_framework.renderers.JSONRenderer",
        ],
        "DEFAULT_THROTTLE_RATES": {
            "anon": "10000/hour",
            "register": "10000/hour",
            "checkout": "10000/hour",
        },
    },
)
class OnboardingFlowTests(APITestCase):
    """register -> create/publish campaign -> guest-message moderation; charity
    self-serve registration + platform-admin verification queue + Connect scope."""

    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client = APIClient()

    def _verified_payout_charity(self):
        from donations.models import PayoutAccount
        c = Charity.objects.create(name="Verified Co", slug="verified-co",
                                   verification_status=Charity.VERIFIED)
        PayoutAccount.objects.create(charity=c, stripe_account_id="acct_v", charges_enabled=True)
        return c

    # --- registration ---
    def _login(self, client, username, password):
        client.post(
            "/api/login/",
            data={"username": username, "password": password},
            format="json",
        )

    def test_register_creates_then_requires_login(self):
        r = self.client.post("/api/register/", {
            "username": "newhost", "password": "Sup3rSecret!42", "display_name": "Sam & Lee",
        }, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertFalse(r.json().get("authenticated", True))
        self.assertTrue(User.objects.filter(username="newhost").exists())
        self.assertFalse(self.client.get("/api/me/").json().get("authenticated"))
        self._login(self.client, "newhost", "Sup3rSecret!42")
        self.assertTrue(self.client.get("/api/me/").json()["authenticated"])

    def test_register_rejects_duplicate_and_weak_password(self):
        User.objects.create_user(username="taken", password="x")
        dup = self.client.post("/api/register/", {"username": "taken", "password": "Sup3rSecret!42"}, format="json")
        self.assertEqual(dup.status_code, 400)
        weak = self.client.post("/api/register/", {"username": "fresh", "password": "123"}, format="json")
        self.assertEqual(weak.status_code, 400)

    # --- host campaign create + publish gate + ownership ---
    def test_campaign_create_publish_gate_and_owner_scope(self):
        self.client.post("/api/register/", {"username": "host", "password": "Sup3rSecret!42"}, format="json")
        self._login(self.client, "host", "Sup3rSecret!42")
        r = self.client.post("/api/campaigns/", {"title": "Our Day", "type": "wedding"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        slug = r.json()["slug"]

        unv = Charity.objects.create(name="Unverified", slug="unverified")
        bad = self.client.patch(f"/api/campaigns/{slug}/", {"status": "active", "charity": unv.id}, format="json")
        self.assertEqual(bad.status_code, 400)

        mm = self._verified_payout_charity()
        ok = self.client.patch(f"/api/campaigns/{slug}/", {"status": "active", "charity": mm.id}, format="json")
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertEqual(ok.json()["status"], "active")

        self.assertEqual(len(self.client.get("/api/campaigns/mine/").json()), 1)

        other = APIClient()
        other.post("/api/register/", {"username": "intruder", "password": "Sup3rSecret!42"}, format="json")
        self._login(other, "intruder", "Sup3rSecret!42")
        self.assertEqual(other.patch(f"/api/campaigns/{slug}/", {"title": "Hijack"}, format="json").status_code, 404)

    def test_cohost_cannot_destroy_campaign(self):
        owner = User.objects.create_user(username="own", password="x")
        cohost = User.objects.create_user(username="co", password="x")
        camp = Campaign.objects.create(
            owner=owner, type="wedding", title="Co", slug="co-camp",
            visibility="public", status="draft",
        )
        camp.cohosts.add(cohost)
        self.client.force_authenticate(cohost)
        resp = self.client.delete(f"/api/campaigns/{camp.slug}/")
        self.assertIn(resp.status_code, (403, 404))
        self.assertTrue(Campaign.objects.filter(slug="co-camp").exists())

    # --- guest message moderation ---
    def test_guest_message_pending_then_host_approves(self):
        host = User.objects.create_user(username="mhost", password="x")
        mm = self._verified_payout_charity()
        camp = Campaign.objects.create(owner=host, type="wedding", title="M", slug="m-camp",
                                       visibility="public", status="active")
        from campaigns.models import CampaignBeneficiary
        CampaignBeneficiary.objects.create(campaign=camp, charity=mm, split_percent=100)
        d = Donation.objects.create(charity=mm, campaign=camp, donor_name="Guest",
                                    donor_email="g@example.com", amount=Decimal("10"), status="pending")
        msg = Message.objects.create(campaign=camp, donation=d, display_name="Guest",
                                     body="Congrats!", moderation_status=Message.PENDING)
        self.assertEqual(len(self.client.get(f"/api/messages/?campaign={camp.slug}").json()), 0)

        other = APIClient(); other.force_authenticate(User.objects.create_user(username="nothost", password="x"))
        self.assertEqual(other.patch(f"/api/campaigns/{camp.slug}/moderate/",
                                     {"message_id": msg.id, "action": "approve"}, format="json").status_code, 404)

        self.client.force_authenticate(host)
        ok = self.client.patch(f"/api/campaigns/{camp.slug}/moderate/",
                               {"message_id": msg.id, "action": "approve"}, format="json")
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertEqual(len(self.client.get(f"/api/messages/?campaign={camp.slug}").json()), 1)

    # --- charity self-serve + verification queue ---
    def test_charity_self_serve_and_verify_queue(self):
        self.client.post("/api/register/", {"username": "charityowner", "password": "Sup3rSecret!42"}, format="json")
        self._login(self.client, "charityowner", "Sup3rSecret!42")
        r = self.client.post("/api/charities/", {"name": "Helping Hands", "description": "We help"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        cid = r.json()["id"]
        charity = Charity.objects.get(id=cid)
        self.assertEqual(charity.verification_status, Charity.UNVERIFIED)
        self.assertTrue(OrgMembership.objects.filter(charity=charity, role=OrgMembership.OWNER).exists())
        self.assertTrue(charity.slug)

        self.assertEqual(self.client.get("/api/charities/pending/").status_code, 403)

        staff = APIClient()
        staff.force_authenticate(User.objects.create_user(username="boss", password="x", is_staff=True))
        self.assertIn(cid, [c["id"] for c in staff.get("/api/charities/pending/").json()])
        v = staff.patch(f"/api/charities/{cid}/verify/", {}, format="json")
        self.assertEqual(v.status_code, 200, v.content)
        charity.refresh_from_db()
        self.assertEqual(charity.verification_status, Charity.VERIFIED)

    def test_connect_onboarding_scoped_to_charity_owner(self):
        from unittest import mock
        owner = User.objects.create_user(username="cowner", password="x")
        charity = Charity.objects.create(name="Conn Co", slug="conn-co")
        OrgMembership.objects.create(user=owner, charity=charity, role=OrgMembership.OWNER)

        intruder = APIClient()
        intruder.force_authenticate(User.objects.create_user(username="nope", password="x"))
        self.assertEqual(
            intruder.post("/api/payments/connect/", {"charity": charity.id}, format="json").status_code, 403
        )

        self.client.force_authenticate(owner)
        with mock.patch("payments.services.create_account_link", return_value="https://connect.stripe.test/x"):
            ok = self.client.post("/api/payments/connect/", {"charity": charity.id}, format="json")
        self.assertEqual(ok.status_code, 200, ok.content)
        self.assertIn("onboarding_url", ok.json())


class LegacyModuleTests(APITestCase):
    def test_retired_v1_charts_module_not_importable(self):
        import importlib
        with self.assertRaises(ModuleNotFoundError):
            importlib.import_module("donations.charts")
