import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import './Home.css';

function Dashboard() {
  const { authUser, setAuthUser } = useContext(AuthContext);
  const [campaigns, setCampaigns] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const charities = authUser?.charities || [];
  const isAdmin = authUser?.isAdmin;
  const needsEmailVerify = authUser?.emailVerificationRequired && !authUser?.emailVerified;
  const [verifyMsg, setVerifyMsg] = useState('');

  const resendVerification = async () => {
    setVerifyMsg('');
    try {
      await axiosInstance.get('/csrf/').catch(() => {});
      const res = await axiosInstance.post('/verify-email/resend/');
      setVerifyMsg(res.data?.message || 'Email sent.');
    } catch (err) {
      setVerifyMsg(err.response?.data?.error || 'Could not send email.');
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        await axiosInstance.get('/csrf/').catch(() => {});
        const meRes = await axiosInstance.get('/me/');
        if (meRes.data?.authenticated) {
          setAuthUser({
            username: meRes.data.username,
            displayName: meRes.data.display_name,
            isAdmin: meRes.data.isAdmin,
            charities: meRes.data.charities || [],
            email: meRes.data.email || '',
            emailVerified: meRes.data.email_verified,
            emailVerificationRequired: meRes.data.email_verification_required,
          });
        }
        const campRes = await axiosInstance.get('/campaigns/mine/');
        setCampaigns(Array.isArray(campRes.data) ? campRes.data : []);

        if (meRes.data?.isAdmin) {
          const donRes = await axiosInstance.get('/donations/');
          setDonations(Array.isArray(donRes.data) ? donRes.data : donRes.data?.results || []);
        }
      } catch {
        setError('Could not load dashboard.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [setAuthUser]);

  const connectCharity = async (charityId) => {
    try {
      const res = await axiosInstance.post('/payments/connect/', { charity: charityId });
      if (res.data?.onboarding_url) window.location.href = res.data.onboarding_url;
    } catch (err) {
      alert(err.response?.data?.error || 'Connect failed');
    }
  };

  if (loading) return <div className="container mt-4 text-center">Loading dashboard…</div>;
  if (error) return <div className="container mt-4 text-danger text-center">{error}</div>;

  return (
    <div className="container mt-4 mb-5">
      <h2 className="text-center">
        Welcome{authUser?.displayName ? `, ${authUser.displayName}` : ''}
      </h2>

      {needsEmailVerify && (
        <div className="alert alert-warning mt-3">
          <strong>Verify your email</strong> before publishing a registry or registering a charity.
          <button type="button" className="btn btn-sm btn-outline-dark ms-2" onClick={resendVerification}>
            Resend email
          </button>
          {verifyMsg && <span className="ms-2">{verifyMsg}</span>}
        </div>
      )}

      <div className="dashboard-grid mt-4">
        <section className="dashboard-card">
          <h3>My registries</h3>
          {campaigns.length === 0 ? (
            <p className="text-muted">No celebration registries yet.</p>
          ) : (
            <ul className="list-group list-group-flush mb-3">
              {campaigns.map((c) => (
                <li key={c.id} className="list-group-item bg-transparent text-light border-secondary d-flex justify-content-between align-items-center px-0">
                  <span>
                    {c.title}
                    <span className="badge bg-secondary ms-2">{c.status}</span>
                  </span>
                  <span>
                    <Link to={`/c/${c.slug}`} className="btn btn-sm btn-outline-light me-1">View</Link>
                    <Link to={`/dashboard/campaigns/${c.slug}`} className="btn btn-sm btn-primary">Manage</Link>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/onboarding/couple" className="btn btn-success btn-sm">New registry</Link>
        </section>

        <section className="dashboard-card">
          <h3>My charities</h3>
          {charities.length === 0 ? (
            <p className="text-muted">No charities linked to your account.</p>
          ) : (
            <ul className="list-group list-group-flush mb-3">
              {charities.map((c) => (
                <li key={c.id} className="list-group-item bg-transparent text-light border-secondary px-0">
                  <strong>{c.name}</strong>
                  <br />
                  <small>
                    {c.verification_status}
                    {c.charges_enabled ? ' · Stripe ready' : ' · Connect payouts needed'}
                  </small>
                  {!c.charges_enabled && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary mt-2"
                      onClick={() => connectCharity(c.id)}
                    >
                      Connect Stripe
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <Link to="/onboarding/charity" className="btn btn-success btn-sm">Register another charity</Link>
        </section>
      </div>

      {isAdmin && (
        <section className="mt-4">
          <h3>All donations (admin)</h3>
          {donations.length === 0 ? (
            <p>No donations.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped table-dark">
                <thead>
                  <tr>
                    <th>Donor</th>
                    <th>Email</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d) => (
                    <tr key={d.id}>
                      <td>{d.donor_name || d.display_name}</td>
                      <td>{d.donor_email}</td>
                      <td>€{d.amount}</td>
                      <td>{d.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link to="/admin" className="btn btn-warning">Admin panel</Link>
        </section>
      )}

      <div className="text-center mt-4 d-flex flex-wrap gap-2 justify-content-center">
        <Link to="/profile" className="btn btn-secondary">Account</Link>
        <Link to="/charities" className="btn btn-outline-light">Explore charities</Link>
      </div>
    </div>
  );
}

export default Dashboard;
