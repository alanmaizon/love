
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

function DonationConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const donation = location.state?.donation;

  // State for fetching bank details from the public profile
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

  if (loading) {
    return <div>Loading payment instructions...</div>;
  }

  // Define preset allowed amounts and check if the donation matches one of them
  const allowedAmounts = [10, 20, 50, 100];
  const donationAmount = parseFloat(donation.amount);
  const isPreset = allowedAmounts.includes(donationAmount);

  // Use the Revolut username (ideally fetched dynamically, here hardcoded for demonstration)
  const revolutUsername = "alanmaizon";
  const revolutPaymentLink = isPreset 
    ? `https://revolut.me/${revolutUsername}?amount=${donationAmount}&currency=EUR` 
    : null;

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
          {isPreset ? (
            <>
              <p>To complete your gift, click below to pay via Revolut:</p>
              <a
                href={revolutPaymentLink}
                className="btn btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Pay with Revolut
              </a>
            </>
          ) : (
            <div className="alert alert-warning mt-3">
              Your donation amount is not pre-configured for automatic payment. Please complete the payment manually in your Revolut app.
            </div>
          )}
          <hr />
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
