import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

function ExploreCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axiosInstance.get('/campaigns/')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setCampaigns(list);
      })
      .catch(() => setError('Could not load campaigns.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container mt-5 text-center">Loading…</div>;
  if (error) return <div className="container mt-5 text-danger text-center">{error}</div>;

  return (
    <div className="container mt-5">
      <h2>Celebration registries</h2>
      <p className="text-muted">Each campaign supports verified charities via Stripe.</p>
      {campaigns.length === 0 ? (
        <p>No public campaigns yet.</p>
      ) : (
        <ul className="list-group mt-4">
          {campaigns.map((c) => (
            <li key={c.id} className="list-group-item d-flex justify-content-between align-items-center">
              <div>
                <strong>{c.title}</strong>
                {c.host_display_name && (
                  <span className="text-muted ms-2">— {c.host_display_name}</span>
                )}
              </div>
              <Link to={`/c/${c.slug}`} className="btn btn-sm btn-outline-primary">
                View
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ExploreCampaigns;
