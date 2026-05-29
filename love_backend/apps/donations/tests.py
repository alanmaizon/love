# donations/tests.py
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from django.contrib.auth.models import User
from .models import Donation, Charity

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
    Security model (v2): donors may CREATE donations anonymously (public giving),
    but mutating state — update, delete, confirm, fail — is admin-only. These
    tests assert both sides of that boundary.
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
        """Helper: create a donation (anonymous, allowed) and return its id."""
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

    def test_get_empty_donations_list(self):
        response = self.client.get(self.donation_list_url, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)

    def test_create_donation_success(self):
        data = {
            "donor_name": "John Doe",
            "donor_email": "john@example.com",
            "amount": 50,
            "message": "Great cause!",
            "charity": self.charity.id
        }
        response = self.client.post(self.donation_list_url, data=data, format="json")
        self.assertEqual(response.status_code, 201)
        result = response.json()
        self.assertEqual(result["donor_name"], "John Doe")
        self.assertEqual(float(result["amount"]), 50.0)

    def test_create_donation_invalid_amount_zero(self):
        data = {
            "donor_name": "John Doe",
            "donor_email": "john@example.com",
            "amount": 0,
            "message": "Zero donation",
            "charity": self.charity.id
        }
        response = self.client.post(self.donation_list_url, data=data, format="json")
        # Expect a 400 because amount should be > 0 per our validation.
        self.assertEqual(response.status_code, 400)

    def test_create_donation_invalid_amount_negative(self):
        data = {
            "donor_name": "John Doe",
            "donor_email": "john@example.com",
            "amount": -10,
            "message": "Negative donation",
            "charity": self.charity.id
        }
        response = self.client.post(self.donation_list_url, data=data, format="json")
        self.assertEqual(response.status_code, 400)

    def test_update_donation_denied_for_anonymous(self):
        donation_id = self._make_donation()
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

    def test_delete_charity_admin(self):
        charity = Charity.objects.create(name="Charity A", description="x")
        self.client.force_authenticate(user=self.admin)
        resp = self.client.delete(f"/api/charities/{charity.id}/")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(Charity.objects.filter(id=charity.id).exists())
