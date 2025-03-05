// src/components/UserDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

function UserDashboard() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDonations = async () => {
    try {
      const response = await axiosInstance.get('/donations/', { withCredentials: true });
      setDonations(response.data);
      setLoading(false);
    } catch (err) {
      setError('Error fetching donations.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  if (loading) {
    return <div>Loading donations...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="container mt-5">
      <h2>User Dashboard</h2>
      <p>Welcome! Here are the donations and messages:</p>
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
                <td>{donation.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Link to="/dashboard/add-charity" className="btn btn-success">
        Add New Charity
      </Link>
      <Link to="/dashboard/charities" className="btn btn-primary">
        Manage Charities
      </Link>
      <Link to="/profile" className="btn btn-secondary">
        Edit Profile
      </Link>
    </div>
  );
}

export default UserDashboard;
