import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { SiRevolut, SiVisa, SiMastercard, SiApplepay, SiGooglepay } from 'react-icons/si';
import { FaLock } from 'react-icons/fa';

function DonationConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const donation = location.state?.donation;

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = paymentLink;
    }, 10000);

    setLoading(false);

    return () => clearTimeout(timer);
  }, [donation]);

  const presetPaymentLinks = {
    10: import.meta.env.VITE_REVOLUT_LINK_10,
    20: import.meta.env.VITE_REVOLUT_LINK_20,
    50: import.meta.env.VITE_REVOLUT_LINK_50,
    100: import.meta.env.VITE_REVOLUT_LINK_100,
  };

  const customPaymentLink = import.meta.env.VITE_REVOLUT_LINK_CUSTOM;

  const donationAmount = parseFloat(donation.amount);
  const presetLink = presetPaymentLinks[donationAmount];
  const paymentLink = presetLink || customPaymentLink;

  if (loading) {
    return <div>Loading payment instructions...</div>;
  }

  return (
    <div className="container mt-5 text-center">
      <h2>Gift Confirmation</h2>
      {donation ? (
        <>
          <p>Thank you, your gift has been submitted!</p>
          <ul className="list-unstyled">
            <li><strong>Name:</strong> {donation.donor_name}</li>
            <li><strong>Email:</strong> {donation.donor_email}</li>
            <li><strong>Amount:</strong> €{donation.amount}</li>
            <li><strong>Message:</strong> {donation.message || 'No message provided'}</li>
          </ul>

          <p className="mt-4">You are being securely redirected to complete your payment.</p>

          <div className="my-3 d-flex justify-content-center align-items-center gap-3 text-success">
            <FaLock size={32} />
            <span className="fw-semibold">Secure Payment</span>
          </div>

          <div className="my-3 d-flex justify-content-center align-items-center gap-4">
            <SiRevolut size={36} />
            <SiVisa size={36} />
            <SiMastercard size={36} />
            <SiApplepay size={36} />
            <SiGooglepay size={36} />
          </div>

          <a href={paymentLink} className="btn btn-primary my-3" target="_blank" rel="noopener noreferrer">
            Click here if you're not redirected automatically.
          </a>

          <small className="d-block mt-4">
            You will receive a confirmation email once your payment is processed.
          </small>
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