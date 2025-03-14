import React, { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { Link } from 'react-router-dom';

function GuestMessages() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axiosInstance.get('/donations/')
      .then(response => {
        // Filter to only show confirmed donations/messages
        const confirmedDonations = response.data.filter(
          donation => donation.status === 'confirmed'
        );
        setDonations(confirmedDonations);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch guest messages.');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="text-center mt-5">Loading messages...</div>;
  }

  if (error) {
    return <div className="alert alert-danger text-center mt-5">{error}</div>;
  }

  return (
    <div className="container py-5">
      <h2 className="text-center mb-4">Guest book</h2>
      {donations.length === 0 ? (
        <p className="text-center">
          No messages yet. Be the first to <Link to="/donate">contribute!</Link>
        </p>
      ) : (
        <div className="row">
          {donations.map(donation => (
            <div key={donation.id} className="col-md-4 mb-3">
              <div className="card shadow-sm">
                <div className="card-body">
                  <h5 className="card-title">{donation.donor_name}</h5>
                  <p className="card-text">
                    {donation.message || "No message provided."}
                  </p>
                  <small>
                    Gifted on {new Date(donation.created_at).toLocaleDateString()}
                  </small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="text-center mt-5">
        <Link to="/donate" className="btn btn-primary">
          Send Your Gift & Message
        </Link>
      </div>
    </div>
  );
}

export default GuestMessages;
