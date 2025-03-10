import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

function DonationConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const donation = location.state?.donation;

  // Fetch public profile to get bank details (and possibly other data)
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance.get('/public_profile/')
      .then(response => {
        setProfile(response.data);
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

  // Define preset allowed donation amounts with their corresponding Revolut checkout links
  const presetPaymentLinks = {
    10: "https://checkout.revolut.com/pay/91fe7cf9-ca92-41fd-9a52-00ed6c7e5a97",
    20: "https://checkout.revolut.com/pay/0be0f6d5-9ded-4b17-b303-04070476dc55",
    50: "https://checkout.revolut.com/pay/0b8c3ee5-7e4e-4fda-80f3-73a6c87c2ea5",
    100: "https://checkout.revolut.com/pay/8761b44b-a67d-4b73-a153-ba33e36ceeff"
  };

  // Revolut checkout link for custom amounts
  const customPaymentLink = "https://checkout.revolut.com/pay/b4b564f7-56ab-4a96-bfde-35277a0a7d7b";

  // Parse the donation amount from the donation object
  const donationAmount = parseFloat(donation.amount);
  // Check if the donation amount matches one of the preset amounts
  const presetLink = presetPaymentLinks[donationAmount];
  // Choose the preset link if available, otherwise use the custom link
  const paymentLink = presetLink ? presetLink : customPaymentLink;

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
            href={paymentLink}
            className="btn btn-primary"
            target="_blank"
            rel="noopener noreferrer"
          >
            Pay with Revolut
          </a>
          <hr />
          <p>Alternatively, you can manually transfer the amount using the following details:</p>
          <ul>
            <li><strong>Bank:</strong> {profile ? profile.bank_name : 'N/A'}</li>
            <li><strong>Account Number:</strong> {profile ? profile.account_number : 'N/A'}</li>
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
