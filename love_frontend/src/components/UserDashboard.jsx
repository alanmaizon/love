import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

function UserDashboard() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDonations();
  }, []);

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

  if (loading) return <div className="text-center mt-4">Loading donations...</div>;
  if (error) return <div className="text-danger text-center mt-4">{error}</div>;

  return (
    <div className="container mt-4">
      <h2 className="text-center">User Dashboard</h2>
      <p className="text-center">Welcome! Here are your donations:</p>

      {donations.length === 0 ? (
        <p className="text-center">No donations yet.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead className="table-dark">
              <tr>
                <th>Donor Name</th>
                <th>Email</th>
                <th>Amount (€)</th>
                <th>Message</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {donations.map(donation => (
                <tr key={donation.id}>
                  <td>{donation.donor_name}</td>
                  <td>{donation.donor_email}</td>
                  <td>€{donation.amount}</td>
                  <td>{donation.message}</td>
                  <td>
                    <span className={`badge ${donation.status === 'confirmed' ? 'bg-success' : donation.status === 'failed' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                      {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Buttons - Responsive Design */}
      <div className="d-flex flex-wrap justify-content-center gap-2 mt-4">
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
    </div>
  );
}

export default UserDashboard;