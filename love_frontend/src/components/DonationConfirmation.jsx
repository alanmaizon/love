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
  // Revolut Checkout Payment Link (Replace with your actual link)
  const revolutBaseURL = "https://checkout.revolut.com/pay/b4b564f7-56ab-4a96-bfde-35277a0a7d7b";

  // Generate payment link dynamically with amount and Gift ID
  const revolutPaymentLink = donation
    ? `${revolutBaseURL}?amount=${donation.amount}&currency=EUR&description=GIFT-${donation.id}`
    : "#";

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
            <li><strong>Reference ID:</strong> GIFT-{donation.id}</li>
          </ul>
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
