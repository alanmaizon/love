// src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdminDashboard() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Function to fetch donation data.
  const fetchDonations = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/donations/', { withCredentials: true });
      // Check if response.data.results exists (paginated response), otherwise use response.data directly.
      const donationArray = response.data.results ? response.data.results : response.data;
      setDonations(donationArray);
      setLoading(false);
    } catch (err) {
      setError('Error fetching donations.');
      setLoading(false);
    }
  };
  

  useEffect(() => {
    fetchDonations();
  }, []);

  // Custom action to confirm a donation via /confirm/ endpoint.
  const confirmDonation = async (donationId) => {
    try {
      await axios.patch(
        `http://localhost:8000/api/donations/${donationId}/confirm/`,
        {},
        { withCredentials: true }
      );
      fetchDonations();
    } catch (err) {
      console.error('Error confirming donation', err);
    }
  };

  // Custom action to mark a donation as failed via /fail/ endpoint.
  const failDonation = async (donationId) => {
    try {
      await axios.patch(
        `http://localhost:8000/api/donations/${donationId}/fail/`,
        {},
        { withCredentials: true }
      );
      fetchDonations();
    } catch (err) {
      console.error('Error marking donation as failed', err);
    }
  };

  if (loading) {
    return <div>Loading donations...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="container mt-5">
      <h2>Admin Dashboard</h2>
      <p>Manage all donations:</p>
      {donations.length === 0 ? (
        <p>No donations yet.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Donor Name</th>
              <th>Email</th>
              <th>Amount</th>
              <th>Message</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {donations.map(donation => (
              <tr key={donation.id}>
                <td>{donation.donor_name}</td>
                <td>{donation.donor_email}</td>
                <td>${donation.amount}</td>
                <td>{donation.message}</td>
                <td>
                  {donation.status === 'pending' ? (
                    <>
                      <button 
                        className="btn btn-success btn-sm" 
                        onClick={() => confirmDonation(donation.id)}
                      >
                        Confirm
                      </button>
                      <button 
                        className="btn btn-danger btn-sm ms-2" 
                        onClick={() => failDonation(donation.id)}
                      >
                        Fail
                      </button>
                    </>
                  ) : (
                    <span data-testid={`donation-status-${donation.id}`}>
                      {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <AnalyticsSection />
    </div>
  );
}

function AnalyticsSection() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/analytics/', { withCredentials: true });
      setAnalytics(response.data);
      setLoading(false);
    } catch (err) {
      setError('Error fetching analytics.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) return <div>Loading analytics...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="mt-5">
      <h3>Analytics</h3>
      <p data-testid="total-amount-value">
        <strong>Total Donation Amount:</strong> ${analytics.total_amount}
      </p>
      <p data-testid="donations-count">
        <strong>Total Donations:</strong> {analytics.donations_count}
      </p>
      <ul>
        {analytics.count_per_charity && analytics.count_per_charity.map(item => (
          <li key={item.charity__name}>
            {item.charity__name}: {item.count} donations, Total: ${item.total_allocated}
          </li>
        ))}
      </ul>
      <div className="mt-5">
        <h4>Combined Analytics</h4>
        <img
          src="http://localhost:8000/api/charts/"
          alt="Combined Analytics Charts"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
    </div>
  );
}

export default AdminDashboard;
