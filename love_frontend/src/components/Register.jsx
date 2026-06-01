import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { AuthContext } from '../context/AuthContext';
import './Home.css';

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authUser, setAuthUser } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const nextPath = searchParams.get('next') || '/dashboard';

  useEffect(() => {
    if (authUser) navigate(nextPath, { replace: true });
  }, [authUser, navigate, nextPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await axiosInstance.get('/csrf/').catch(() => {});
      const regRes = await axiosInstance.post('/register/', {
        username,
        email,
        password,
        display_name: displayName,
      });
      await axiosInstance.post('/login/', { username, password });
      localStorage.removeItem('loggedOut');
      const meRes = await axiosInstance.get('/me/');
      const payload = {
        username: meRes.data.username,
        displayName: meRes.data.display_name,
        isAdmin: meRes.data.isAdmin,
        charities: meRes.data.charities || [],
        email: meRes.data.email || email,
        emailVerified: meRes.data.email_verified,
        emailVerificationRequired: meRes.data.email_verification_required,
      };
      setAuthUser(payload);
      if (regRes.data?.message?.includes('Check your email')) {
        navigate('/dashboard', { replace: true, state: { verifyEmail: true } });
      } else {
        navigate(nextPath, { replace: true });
      }
    } catch (err) {
      const data = err.response?.data;
      if (typeof data === 'object' && data !== null) {
        setError(Object.values(data).flat()[0] || 'Registration failed.');
      } else {
        setError('Registration failed.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onboarding-page">
      <h2>Create account</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit} className="onboarding-panel">
        <div className="mb-3">
          <label className="form-label" htmlFor="displayName">Display name</label>
          <input
            id="displayName"
            className="form-control"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="username">Username</label>
          <input
            id="username"
            className="form-control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Creating…' : 'Sign up'}
        </button>
      </form>
      <p className="mt-3">
        Already registered? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

export default Register;
