import React from 'react';
import { useLocation, Link } from 'react-router-dom';

// v2: donors return here from Stripe-hosted Checkout (success_url carries
// ?session_id=...). Payment already happened on Stripe — no Revolut links, no
// further action. Render a safe thank-you that works with or without state.
function DonationConfirmation() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');
  const donation = location.state?.donation;

  return (
    <div className="container mt-5 text-center">
      <h2>Thank you! 💛</h2>
      <p className="lead">
        Your donation has been received and goes 100% to the charity you chose.
      </p>
      {donation?.amount && (
        <p><strong>Amount:</strong> €{donation.amount}</p>
      )}
      {sessionId && (
        <p className="text-muted"><small>Payment reference: {sessionId}</small></p>
      )}
      <p>A receipt will be emailed to you shortly.</p>
      <div className="mt-4">
        <Link to="/" className="btn btn-primary me-2">Back to Home</Link>
        <Link to="/messages" className="btn btn-outline-secondary">Read the guestbook</Link>
      </div>
    </div>
  );
}

export default DonationConfirmation;
