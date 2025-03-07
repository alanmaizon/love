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
      <h2>Gift Confirmation</h2>
      {donation ? (
        <div>
          <p>Thank you, your gift has been submitted!</p>
          <p><strong>Contribution Details:</strong></p>
          <ul>
            <li>Name: {donation.donor_name}</li>
            <li>Email: {donation.donor_email}</li>
            <li>Amount: ${donation.amount}</li>
            <li>Message: {donation.message || 'No message provided'}</li>
          </ul>
        </div>
      ) : (
        <p>Your contribution was submitted successfully!</p>
      )}
      <p>
        You will receive a confirmation email shortly. If you have any questions, please contact us.
      </p>
      <Link to="/payment-instructions" className="btn btn-primary mr-2">
        View Payment Instructions
      </Link>
      <Link to="/explore-charities" className="btn btn-secondary">
        Explore More Charities
      </Link>
      <br />
      <button className="btn btn-primary" onClick={() => navigate('/')}>
        Return Home
      </button>
    </div>
  );
}

export default DonationConfirmation;
