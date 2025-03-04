// src/components/PaymentInstructions.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function PaymentInstructions() {
  const navigate = useNavigate();
  const [bankInfo, setBankInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:8000/api/public_profile/')
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

  return (
    <div className="container mt-5">
      <h2>Manual Payment Instructions</h2>
      <p>
        To complete your donation, please follow these manual payment instructions:
      </p>
      <ul>
        <li>Transfer the donation amount to the following bank account:</li>
        <li><strong>Bank:</strong> {bankInfo ? bankInfo.bank_name : 'N/A'}</li>
        <li><strong>Account Number:</strong> {bankInfo ? bankInfo.account_number : 'N/A'}</li>
        <li><strong>Routing Number:</strong> {bankInfo ? bankInfo.bank_identifier : 'N/A'}</li>
        <li><strong>Reference:</strong> Your Donation ID (provided in your confirmation email)</li>
      </ul>
      <p>
        Once your payment is received, your donation status will be updated. If you have any questions, please contact us.
      </p>
      <button className="btn btn-primary" onClick={() => navigate('/')}>
        Return Home
      </button>
    </div>
  );
}

export default PaymentInstructions;
