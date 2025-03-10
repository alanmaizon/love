import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

function DonationConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const donation = location.state?.donation;
  const isCustomAmount = location.state?.isCustomAmount || false;

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

  if (loading) {
    return <div>Loading payment instructions...</div>;
  }

  // Mapping of donation amounts to Revolut Checkout links
  const revolutLinks = {
    "10": "https://checkout.revolut.com/pay/91fe7cf9-ca92-41fd-9a52-00ed6c7e5a97",
    "20": "https://checkout.revolut.com/pay/0be0f6d5-9ded-4b17-b303-04070476dc55",
    "50": "https://checkout.revolut.com/pay/0b8c3ee5-7e4e-4fda-80f3-73a6c87c2ea5",
    "100": "https://checkout.revolut.com/pay/8761b44b-a67d-4b73-a153-ba33e36ceeff",
  };

  // Custom Revolut payment link for any amount
  const customRevolutPaymentLink = "https://checkout.revolut.com/pay/b4b564f7-56ab-4a96-bfde-35277a0a7d7b";

  // Get the correct payment link based on donation amount
  const revolutPaymentLink = donation && !isCustomAmount ? revolutLinks[donation.amount] : customRevolutPaymentLink;

  return (
    <div className="container mt-5">
      <h2>Gift Confirmation</h2>
      {donation ? (
        <>
          <p>Thank you, your gift has been submitted!</p>
          <p>Your donation will be allocated as follows:</p>
          <ul>
            <li><strong>50% (€{(donation.amount * 0.5).toFixed(2)})</strong> evenly split among all supported charities.</li>
            <li><strong>50% (€{(donation.amount * 0.5).toFixed(2)})</strong> directly supports the wedding couple.</li>
          </ul>
          <p>Your generosity is greatly appreciated!</p>
          <hr />
          <p>Here are the details:</p>
          <ul>
            <li><strong>Name:</strong> {donation.donor_name}</li>
            <li><strong>Email:</strong> {donation.donor_email}</li>
            <li><strong>Amount:</strong> €{donation.amount}</li>
            <li><strong>Message:</strong> {donation.message || 'No message provided'}</li>
            <li><strong>Reference ID:</strong> <span id="referenceId">GIFT-{donation.id}</span></li>
          </ul>

          {isCustomAmount ? (
            <>
              <p><strong>To complete your custom gift, follow the instructions below:</strong></p>
              <p>Click the button below and **manually enter the amount** (€{donation.amount}) in the Revolut checkout.</p>
              <a href={customRevolutPaymentLink} className="btn btn-warning" target="_blank" rel="noopener noreferrer">
                Pay Custom Amount via Revolut
              </a>

              <p className="mt-3"><strong>Important:</strong> Enter the following reference ID in the payment note:</p>
              <div className="alert alert-info">
                <strong>Reference ID: <span id="copyRef">{`GIFT-${donation.id}`}</span></strong>
                <button onClick={() => navigator.clipboard.writeText(`GIFT-${donation.id}`)} className="btn btn-sm btn-outline-secondary ms-2">
                  Copy
                </button>
              </div>
            </>
          ) : (
            <>
              <p><strong>To complete your gift, click below to pay via Revolut:</strong></p>
              <a href={revolutPaymentLink} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
                Pay with Revolut (€{donation.amount})
              </a>
            </>
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
