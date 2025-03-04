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
    def setUp(self):
        self.client = APIClient()
        # Create a charity to use as a foreign key in donations.
        self.charity = Charity.objects.create(name="Test Charity", description="A charity for testing.")
        # Use the literal paths (adjust if you have a different URL prefix).
        self.donation_list_url = "/api/donations/"

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

    def test_update_donation(self):
        # First, create a donation.
        data = {
            "donor_name": "John Doe",
            "donor_email": "john@example.com",
            "amount": 50,
            "message": "Initial donation",
            "charity": self.charity.id
        }
        create_response = self.client.post(self.donation_list_url, data=data, format="json")
        self.assertEqual(create_response.status_code, 201)
        donation_id = create_response.json()["id"]
        donation_detail_url = f"/api/donations/{donation_id}/"

        # Now update the donation.
        update_data = {
            "donor_name": "Jane Doe",
            "donor_email": "jane@example.com",
            "amount": 75,
            "message": "Updated donation",
            "charity": self.charity.id
        }
        update_response = self.client.put(donation_detail_url, data=update_data, format="json")
        self.assertEqual(update_response.status_code, 200)
        updated = update_response.json()
        self.assertEqual(updated["donor_name"], "Jane Doe")
        self.assertEqual(float(updated["amount"]), 75.0)

    def test_delete_donation(self):
        # Create a donation to delete.
        data = {
            "donor_name": "John Doe",
            "donor_email": "john@example.com",
            "amount": 50,
            "message": "Donation to delete",
            "charity": self.charity.id
        }
        create_response = self.client.post(self.donation_list_url, data=data, format="json")
        self.assertEqual(create_response.status_code, 201)
        donation_id = create_response.json()["id"]
        donation_detail_url = f"/api/donations/{donation_id}/"
        delete_response = self.client.delete(donation_detail_url)
        self.assertEqual(delete_response.status_code, 204)
        # Verify that the donation no longer exists.
        get_response = self.client.get(donation_detail_url)
        self.assertEqual(get_response.status_code, 404)

    def test_confirm_donation_action(self):
        # Create a donation first.
        data = {
            "donor_name": "John Doe",
            "donor_email": "john@example.com",
            "amount": 50,
            "message": "Great cause!",
            "charity": self.charity.id
        }
        create_response = self.client.post(self.donation_list_url, data=data, format="json")
        self.assertEqual(create_response.status_code, 201)
        donation_id = create_response.json()["id"]
        confirm_url = f"/api/donations/{donation_id}/confirm/"

        # Call the custom confirm donation action.
        confirm_response = self.client.patch(confirm_url, data={}, format="json")
        self.assertEqual(confirm_response.status_code, 200)
        updated_donation = confirm_response.json()
        self.assertEqual(updated_donation["status"], "confirmed")

    def test_confirm_donation_non_existent(self):
        # Try to confirm a donation with an invalid ID.
        confirm_url = "/api/donations/9999/confirm/"
        response = self.client.patch(confirm_url, data={}, format="json")
        self.assertEqual(response.status_code, 404)

# -------------------------
# Charity Endpoint Tests
# -------------------------
class CharityTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.charity_list_url = "/api/charities/"

    def test_get_empty_charities_list(self):
        response = self.client.get(self.charity_list_url, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 0)

    def test_create_charity_success(self):
        data = {
            "name": "Charity A",
            "description": "Helping the community"
        }
        response = self.client.post(self.charity_list_url, data=data, format="json")
        self.assertEqual(response.status_code, 201)
        result = response.json()
        self.assertEqual(result["name"], "Charity A")

    def test_update_charity(self):
        # Create a charity.
        data = {
            "name": "Charity A",
            "description": "Helping the community"
        }
        create_response = self.client.post(self.charity_list_url, data=data, format="json")
        self.assertEqual(create_response.status_code, 201)
        charity_id = create_response.json()["id"]
        charity_detail_url = f"/api/charities/{charity_id}/"
        # Update the charity.
        update_data = {
            "name": "Updated Charity",
            "description": "New description"
        }
        update_response = self.client.put(charity_detail_url, data=update_data, format="json")
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.json()["name"], "Updated Charity")

    def test_delete_charity(self):
        data = {
            "name": "Charity A",
            "description": "Helping the community"
        }
        create_response = self.client.post(self.charity_list_url, data=data, format="json")
        self.assertEqual(create_response.status_code, 201)
        charity_id = create_response.json()["id"]
        charity_detail_url = f"/api/charities/{charity_id}/"
        delete_response = self.client.delete(charity_detail_url)
        self.assertEqual(delete_response.status_code, 204)
        get_response = self.client.get(charity_detail_url)
        self.assertEqual(get_response.status_code, 404)
