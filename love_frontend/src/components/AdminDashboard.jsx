import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

function AdminDashboard() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // Default tab

  useEffect(() => {
    fetchDonations();
  }, []);

  // Function to fetch donation data.
  const fetchDonations = async () => {
    try {
      const response = await axiosInstance.get('/donations/');
      const donationArray = response.data.results ? response.data.results : response.data;
      setDonations(donationArray);
      setLoading(false);
    } catch (err) {
      setError('Error fetching donations.');
      setLoading(false);
    }
  };

  // Confirm a donation
  const confirmDonation = async (donationId) => {
    try {
      await axiosInstance.patch(`/donations/${donationId}/confirm/`, {});
      fetchDonations();
    } catch (err) {
      console.error('Error confirming donation', err);
    }
  };

  // Fail a donation
  const failDonation = async (donationId) => {
    try {
      await axiosInstance.patch(`/donations/${donationId}/fail/`, {});
      fetchDonations();
    } catch (err) {
      console.error('Error marking donation as failed', err);
    }
  };

  if (loading) return <div className="text-center mt-4">Loading donations...</div>;
  if (error) return <div className="text-danger text-center mt-4">{error}</div>;

  // Filter donations based on tab selection
  const pendingDonations = donations.filter(donation => donation.status === 'pending');
  const processedDonations = donations.filter(donation => donation.status !== 'pending');

  return (
    <div className="container mt-4">
      <h2 className="text-center">Admin Dashboard</h2>

      {/* Tabs */}
      <ul className="nav nav-tabs justify-content-center mt-3">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending Donations
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'processed' ? 'active' : ''}`}
            onClick={() => setActiveTab('processed')}
          >
            Confirmed / Failed
          </button>
        </li>
      </ul>

      {/* Donations Table */}
      <div className="mt-4">
        {activeTab === 'pending' ? (
          <DonationsTable
            donations={pendingDonations}
            confirmDonation={confirmDonation}
            failDonation={failDonation}
          />
        ) : (
          <DonationsTable donations={processedDonations} />
        )}
      </div>
    </div>
  );
}

// Table Component
function DonationsTable({ donations, confirmDonation, failDonation }) {
  if (donations.length === 0) {
    return <p className="text-center mt-3">No donations found.</p>;
  }

  return (
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
                  <span className={`badge ${donation.status === 'confirmed' ? 'bg-success' : 'bg-danger'}`}>
                    {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AdminDashboard;