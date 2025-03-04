// src/components/DonationConfirmation.jsx
import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';

function DonationConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();

  // The donation details passed from the DonationForm (if any)
  const donation = location.state?.donation;

  return (
    <div className="container mt-5">
      <h2>Donation Confirmation</h2>
      {donation ? (
        <div>
          <p>Thank you, your donation has been submitted successfully!</p>
          <p><strong>Donation Details:</strong></p>
          <ul>
            <li>Name: {donation.donor_name}</li>
            <li>Email: {donation.donor_email}</li>
            <li>Amount: ${donation.amount}</li>
            <li>Message: {donation.message || 'No message provided'}</li>
          </ul>
          <Link to="/payment-instructions" className="btn btn-info">
            View Payment Instructions
          </Link>
        </div>
      ) : (
        <p>Your donation was submitted successfully!</p>
      )}
      <button className="btn btn-primary" onClick={() => navigate('/')}>
        Return Home
      </button>
    </div>
  );
}

export default DonationConfirmation;
