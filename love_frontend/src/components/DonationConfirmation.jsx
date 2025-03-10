// src/components/DonationConfirmation.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function DonationConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const donation = location.state?.donation;

  // Generate Revolut payment link dynamically
  const revolutUsername = "alanmaizon"; // Replace with your Revolut handle
  const revolutPaymentLink = `https://revolut.me/${revolutUsername}?amount=${donation?.amount}&currency=EUR`;

  return (
    <div className="container mt-5">
      <h2>Gift Confirmation</h2>
      {donation ? (
        <>
          <p>Thank you, your gift has been submitted!</p>
          <ul>
            <li><strong>Name:</strong> {donation.donor_name}</li>
            <li><strong>Email:</strong> {donation.donor_email}</li>
            <li><strong>Amount:</strong> €{donation.amount}</li>
            <li><strong>Message:</strong> {donation.message || 'No message provided'}</li>
          </ul>
          <p>To complete your gift, click below to pay via Revolut:</p>

          {/* Button linking to Revolut payment */}
          <a href={revolutPaymentLink} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
            Pay with Revolut
          </a>

          <br></br>
          <p>Alternatively, you can manually transfer the amount using the following details:</p>
          <ul>
            <li>Transfer the gift amount to the following bank account:</li>
            <li><strong>Bank:</strong> {bankInfo ? bankInfo.bank_name : 'N/A'}</li>
            <li><strong>Account Number:</strong> {bankInfo ? bankInfo.account_number : 'N/A'}</li>
            <li><strong>Reference:</strong> GIFT-{donation.id}</li>
          </ul>
        </>
      ) : (
        <p>Your contribution was submitted successfully!</p>
      )}
      <button className="btn btn-secondary mt-3" onClick={() => navigate('/')}>
        Return Home
      </button>
    </div>
  );
}

export default DonationConfirmation;
