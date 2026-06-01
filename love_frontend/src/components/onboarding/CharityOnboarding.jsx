import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { AuthContext } from '../../context/AuthContext';
import AuthPanel from './AuthPanel';
import '../Home.css';

function CharityOnboarding() {
  const { authUser, setAuthUser } = useContext(AuthContext);
  const [step, setStep] = useState(authUser ? 1 : 0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [charityId, setCharityId] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('unverified');
  const [chargesEnabled, setChargesEnabled] = useState(false);

  useEffect(() => {
    if (authUser && step === 0) setStep(1);
  }, [authUser, step]);

  const refreshCharity = async (id) => {
    const me = await axiosInstance.get('/me/');
    const row = (me.data.charities || []).find((c) => c.id === id);
    if (row) {
      setVerificationStatus(row.verification_status);
      setChargesEnabled(row.charges_enabled);
    }
  };

  const handleAuthed = (payload) => {
    setAuthUser(payload);
    setStep(1);
  };

  const registerCharity = async () => {
    setError('');
    setBusy(true);
    try {
      await axiosInstance.get('/csrf/').catch(() => {});
      const res = await axiosInstance.post('/charities/', { name, description, website });
      setCharityId(res.data.id);
      setVerificationStatus(res.data.verification_status || 'unverified');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.name?.[0] || 'Could not register charity.');
    } finally {
      setBusy(false);
    }
  };

  const startConnect = async () => {
    if (!charityId) return;
    setError('');
    setBusy(true);
    try {
      const res = await axiosInstance.post('/payments/connect/', { charity: charityId });
      if (res.data?.onboarding_url) {
        window.location.href = res.data.onboarding_url;
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Could not start Stripe Connect.');
      setBusy(false);
    }
  };

  useEffect(() => {
    if (charityId && step >= 2) refreshCharity(charityId);
  }, [charityId, step]);

  const stepLabels = ['Account', 'Organisation', 'Payouts', 'Next steps'];

  return (
    <div className="onboarding-page">
      <h1>Register your charity</h1>
      <div className="onboarding-steps">
        {stepLabels.map((label, i) => (
          <span
            key={label}
            className={`onboarding-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
          >
            {label}
          </span>
        ))}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {step === 0 && (
        <AuthPanel onAuthed={handleAuthed} title="Sign in to register your charity" />
      )}

      {step === 1 && (
        <div className="onboarding-panel">
          <h3>Charity details</h3>
          <div className="mb-3">
            <label className="form-label">Legal / public name</label>
            <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Website</label>
            <input type="url" className="form-control" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <button type="button" className="btn btn-primary" onClick={registerCharity} disabled={busy}>
            {busy ? 'Saving…' : 'Continue'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="onboarding-panel">
          <h3>Stripe Connect payouts</h3>
          <p className="small">
            Connect your Stripe account so donations can reach your organisation. Bank details stay with Stripe — never in our app.
          </p>
          <p>
            Status: <strong>{verificationStatus}</strong>
            {chargesEnabled ? ' · payouts ready' : ' · complete Connect to enable payouts'}
          </p>
          <button type="button" className="btn btn-primary mb-2" onClick={startConnect} disabled={busy}>
            {busy ? 'Opening Stripe…' : 'Connect with Stripe'}
          </button>
          <button type="button" className="btn btn-outline-secondary" onClick={() => setStep(3)}>
            Skip for now
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="onboarding-panel">
          <h3>What happens next</h3>
          <ul>
            <li>Our team reviews your charity and marks it <strong>verified</strong>.</li>
            <li>Hosts can then select your charity on their celebration registries.</li>
            <li>Donations flow via Stripe when guests complete Checkout.</li>
          </ul>
          <Link to="/dashboard" className="btn btn-primary">Go to dashboard</Link>
        </div>
      )}

      <p className="mt-3 text-center">
        <Link to="/get-started">← Back</Link>
      </p>
    </div>
  );
}

export default CharityOnboarding;
