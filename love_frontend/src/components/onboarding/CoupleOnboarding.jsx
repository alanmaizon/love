import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axiosInstance from '../../api/axiosInstance';
import { AuthContext } from '../../context/AuthContext';
import AuthPanel from './AuthPanel';
import '../Home.css';

const TYPES = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'memorial', label: 'Memorial' },
  { value: 'anniversary', label: 'Anniversary' },
  { value: 'general', label: 'Other celebration' },
];

function CoupleOnboarding() {
  const navigate = useNavigate();
  const { authUser, setAuthUser } = useContext(AuthContext);
  const [step, setStep] = useState(authUser ? 1 : 0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('wedding');
  const [story, setStory] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [charities, setCharities] = useState([]);
  const [charityId, setCharityId] = useState('');
  const [campaignSlug, setCampaignSlug] = useState('');

  useEffect(() => {
    if (authUser && step === 0) setStep(1);
  }, [authUser, step]);

  useEffect(() => {
    if (step >= 2) {
      axiosInstance.get('/charities/')
        .then((res) => {
          const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
          setCharities(list.filter((c) => c.is_verified));
        })
        .catch(() => setCharities([]));
    }
  }, [step]);

  const handleAuthed = (payload) => {
    setAuthUser(payload);
    setStep(1);
  };

  const createCampaign = async () => {
    setError('');
    setBusy(true);
    try {
      await axiosInstance.get('/csrf/').catch(() => {});
      const res = await axiosInstance.post('/campaigns/', {
        title,
        type,
        story,
        event_date: eventDate || null,
        location,
        status: 'draft',
        visibility: 'public',
      });
      setCampaignSlug(res.data.slug);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.title?.[0] || err.response?.data?.error || 'Could not create registry.');
    } finally {
      setBusy(false);
    }
  };

  const publishCampaign = async (asDraft) => {
    if (!campaignSlug) return;
    setError('');
    setBusy(true);
    try {
      await axiosInstance.patch(`/campaigns/${campaignSlug}/`, {
        charity: charityId ? Number(charityId) : undefined,
        status: asDraft ? 'draft' : 'active',
      });
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.status?.[0]
        || err.response?.data?.charity?.[0]
        || 'Could not publish. The charity must be verified and payout-ready.';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const stepLabels = ['Account', 'Your celebration', 'Charity', 'Done'];

  return (
    <div className="onboarding-page">
      <h1>Start your registry</h1>
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
        <AuthPanel onAuthed={handleAuthed} title="Sign in to create your registry" />
      )}

      {step === 1 && (
        <div className="onboarding-panel">
          <h3>Tell guests about your celebration</h3>
          <div className="mb-3">
            <label className="form-label">Registry title</label>
            <input className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label className="form-label">Occasion</label>
            <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Your story</label>
            <textarea className="form-control" rows={4} value={story} onChange={(e) => setStory(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="form-label">Event date</label>
            <input type="date" className="form-control" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="form-label">Location</label>
            <input className="form-control" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <button type="button" className="btn btn-primary" onClick={createCampaign} disabled={busy || !title.trim()}>
            {busy ? 'Saving…' : 'Continue'}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="onboarding-panel">
          <h3>Choose a charity</h3>
          <p className="small text-muted">
            100% of gifts go to the charity you select. It must be verified and ready to accept Stripe payouts.
          </p>
          <div className="mb-3">
            <select className="form-select" value={charityId} onChange={(e) => setCharityId(e.target.value)} required>
              <option value="">— Select charity —</option>
              {charities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {charities.length === 0 && (
            <p className="alert alert-warning">
              No verified charities yet. <Link to="/charities">Browse charities</Link> or ask your charity to register first.
            </p>
          )}
          <div className="d-flex gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !charityId}
              onClick={() => publishCampaign(false)}
            >
              Publish registry
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              disabled={busy}
              onClick={() => publishCampaign(true)}
            >
              Save as draft
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="onboarding-panel text-center">
          <h3>You&apos;re all set</h3>
          <p>Share your registry page with guests so they can donate and leave messages.</p>
          <div className="d-flex gap-2 justify-content-center flex-wrap">
            {campaignSlug && (
              <Link to={`/c/${campaignSlug}`} className="btn btn-primary">View registry</Link>
            )}
            <Link to="/dashboard" className="btn btn-outline-primary">Go to dashboard</Link>
          </div>
        </div>
      )}

      <p className="mt-3 text-center">
        <Link to="/get-started">← Back</Link>
      </p>
    </div>
  );
}

export default CoupleOnboarding;
