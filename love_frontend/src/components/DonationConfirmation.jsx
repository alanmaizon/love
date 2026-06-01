import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

// React Strict Mode runs effects twice; avoid duplicate sync-checkout POSTs on SQLite.
const syncInFlight = new Set();

// v2: donors return here from Stripe-hosted Checkout (success_url carries
// ?session_id=...). Payment already happened on Stripe — no Revolut links, no
// further action. Render a safe thank-you that works with or without state.
function DonationConfirmation() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get('session_id');
  const donation = location.state?.donation;
  const [syncStatus, setSyncStatus] = useState(null);

  // Local dev: Stripe Dashboard/CLI webhooks often never hit localhost — confirm
  // from the cs_ id on the success URL (DEBUG-only API).
  useEffect(() => {
    if (!sessionId || syncInFlight.has(sessionId)) return undefined;
    syncInFlight.add(sessionId);
    let cancelled = false;
    (async () => {
      try {
        await axiosInstance.get('/csrf/');
        const { data } = await axiosInstance.post('/payments/sync-checkout/', {
          session_id: sessionId,
        });
        if (!cancelled) setSyncStatus(data.status === 'confirmed' ? 'confirmed' : data.status);
      } catch {
        if (!cancelled) setSyncStatus('pending');
      } finally {
        syncInFlight.delete(sessionId);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId]);

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
      {syncStatus === 'pending' && (
        <p className="text-warning small">
          Payment received by Stripe; confirmation is still processing. If this persists,
          run <code>stripe listen --forward-to localhost:8000/api/payments/webhook/</code>.
        </p>
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
