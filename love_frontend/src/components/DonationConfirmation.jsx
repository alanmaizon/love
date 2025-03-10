import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance'; // Make sure to import this

function DonationConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const donation = location.state?.donation;

  // State for bank info and loading state
  const [bankInfo, setBankInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get('/public_profile/')
      .then(response => {
        setBankInfo(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching public profile:', error);
        setLoading(false);
      });
  }, []);

  // If data is still loading, show a placeholder
  if (loading) {
    return <div>Loading payment instructions...</div>;
  }

  // Generate Revolut payment link dynamically
  const revolutUsername = bankInfo?.revolut_username || "alanmaizon"; 
  const revolutPaymentLink = `https://revolut.me/${revolutUsername}`;

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
          <a
            href={revolutPaymentLink}
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pay with Revolut
          </a>
          <hr />
          <p>Don't have Revolut? No problem!</p>
          <p>Alternatively, you can manually transfer the amount using the following details:</p>
          <ul>
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
