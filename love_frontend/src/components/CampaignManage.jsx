import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import './Home.css';

function CampaignManage() {
  const { slug } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [messages, setMessages] = useState([]);
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [status, setStatus] = useState('draft');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [campRes, msgRes] = await Promise.all([
        axiosInstance.get(`/campaigns/${slug}/`),
        axiosInstance.get(`/campaigns/${slug}/guestbook/`),
      ]);
      setCampaign(campRes.data);
      setTitle(campRes.data.title || '');
      setStory(campRes.data.story || '');
      setStatus(campRes.data.status || 'draft');
      setMessages(Array.isArray(msgRes.data) ? msgRes.data : []);
    } catch {
      setError('Could not load this registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [slug]);

  const save = async () => {
    setFeedback('');
    setError('');
    try {
      await axiosInstance.patch(`/campaigns/${slug}/`, { title, story, status });
      setFeedback('Saved.');
      load();
    } catch (err) {
      setError(err.response?.data?.status?.[0] || 'Save failed.');
    }
  };

  const moderate = async (messageId, action) => {
    try {
      await axiosInstance.get('/csrf/').catch(() => {});
      await axiosInstance.patch(`/campaigns/${slug}/moderate/`, { message_id: messageId, action });
      load();
    } catch {
      alert('Moderation failed');
    }
  };

  if (loading) return <div className="container mt-4">Loading…</div>;
  if (error) return <div className="container mt-4 alert alert-danger">{error}</div>;

  return (
    <div className="container mt-4 mb-5 onboarding-page" style={{ maxWidth: 720 }}>
      <h2>Manage registry</h2>
      <p>
        <Link to={`/c/${slug}`}>View public page</Link>
        {' · '}
        <Link to="/dashboard">Dashboard</Link>
      </p>

      {feedback && <div className="alert alert-success">{feedback}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="onboarding-panel mb-4">
        <h3>Details</h3>
        <div className="mb-3">
          <label className="form-label">Title</label>
          <input className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">Story</label>
          <textarea className="form-control" rows={4} value={story} onChange={(e) => setStory(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">Status</label>
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">Draft</option>
            <option value="active">Active (published)</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <button type="button" className="btn btn-primary" onClick={save}>Save changes</button>
      </div>

      <div className="onboarding-panel">
        <h3>Guestbook moderation</h3>
        {messages.length === 0 ? (
          <p className="text-muted">No messages yet.</p>
        ) : (
          <ul className="list-group">
            {messages.map((m) => (
              <li key={m.id} className="list-group-item bg-transparent text-light border-secondary">
                <strong>{m.display_name}</strong>
                <span className="badge bg-secondary ms-2">{m.moderation_status}</span>
                <p className="mb-2 mt-1">{m.body}</p>
                {m.moderation_status === 'pending' && (
                  <span>
                    <button type="button" className="btn btn-sm btn-success me-1" onClick={() => moderate(m.id, 'approve')}>
                      Approve
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => moderate(m.id, 'hide')}>
                      Hide
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {campaign?.beneficiaries?.[0]?.charity && (
        <p className="mt-3 small text-muted">
          Beneficiary: {campaign.beneficiaries[0].charity.name}
        </p>
      )}
    </div>
  );
}

export default CampaignManage;
