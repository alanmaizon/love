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

  // Allowed preset amounts
  const allowedAmounts = ["10", "20", "50", "100"];

  // Determine the payment link only if a preset is selected
  const revolutUsername = "alanmaizon"; // Ideally, fetch this dynamically from the profile data.
  const paymentLink = allowedAmounts.includes(selectedAmount)
    ? `https://revolut.me/${revolutUsername}?amount=${selectedAmount}&currency=EUR`
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
          <p>To complete your gift, click below to pay via Revolut:</p>
          {paymentLink ? (
            <div className="mt-2">
              <a
                href={paymentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-info"
              >
                Pay €{selectedAmount} with Revolut
              </a>
            </div>
          ) : selectedAmount === "custom" ? (
            <div className="mt-2 alert alert-warning">
              For custom amounts, please complete the payment manually in your Revolut app.
            </div>
          ) : null}
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
