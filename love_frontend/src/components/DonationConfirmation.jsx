import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { SiRevolut, SiVisa, SiMastercard, SiApplepay, SiGooglepay } from 'react-icons/si';


function DonationConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const donation = location.state?.donation;

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
          <p>To complete your gift, select a payment method:</p>

          <a href={paymentLink} className="btn btn-primary mb-3" target="_blank" rel="noopener noreferrer">
            Pay with Revolut Checkout
          </a>

          <div className="my-3 d-flex align-items-center gap-4">
            <SiRevolut size={40} />
            <SiVisa size={40} />
            <SiMastercard size={40} />
            <SiApplepay size={40} />
            <SiGooglepay size={40} />
          </div>

          <p className="text-success mb-2">
            The payment link is secure. You will receive a confirmation email once your payment is processed.
          </p>

          <hr />
          <p>You can also transfer manually using the details below:</p>
          <ul>
            <li><strong>Bank:</strong> {profile.bank_name}</li>
            <li><strong>Account Number:</strong> {profile.account_number}</li>
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