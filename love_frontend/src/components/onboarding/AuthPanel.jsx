import React, { useState } from 'react';
import axiosInstance from '../../api/axiosInstance';

/**
 * Shared register-then-login step for onboarding wizards.
 * Calls onAuthed(userPayload) after successful login.
 */
function AuthPanel({ onAuthed, title = 'Create your account' }) {
  const [mode, setMode] = useState('register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const finishLogin = async () => {
    await axiosInstance.get('/csrf/').catch(() => {});
    await axiosInstance.post('/login/', { username, password });
    localStorage.removeItem('loggedOut');
    const meRes = await axiosInstance.get('/me/');
    const payload = {
      username: meRes.data.username,
      displayName: meRes.data.display_name,
      isAdmin: meRes.data.isAdmin,
      charities: meRes.data.charities || [],
    };
    const channel = new BroadcastChannel('auth_channel');
    channel.postMessage({ type: 'LOGIN', payload });
    channel.close();
    onAuthed(payload);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await axiosInstance.get('/csrf/').catch(() => {});
      if (mode === 'register') {
        await axiosInstance.post('/register/', {
          username,
          password,
          display_name: displayName,
        });
      }
      await finishLogin();
    } catch (err) {
      const data = err.response?.data;
      if (typeof data === 'object' && data !== null) {
        const first = Object.values(data).flat()[0];
        setError(first || 'Could not complete sign-in.');
      } else {
        setError(data?.error || 'Could not complete sign-in.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="onboarding-panel">
      <h3>{title}</h3>
      <div className="btn-group mb-3" role="group">
        <button
          type="button"
          className={`btn btn-sm ${mode === 'register' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setMode('register')}
        >
          New account
        </button>
        <button
          type="button"
          className={`btn btn-sm ${mode === 'login' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setMode('login')}
        >
          I have an account
        </button>
      </div>
      {error && <div className="alert alert-danger">{error}</div>}
      <form onSubmit={handleSubmit}>
        {mode === 'register' && (
          <div className="mb-3">
            <label className="form-label" htmlFor="displayName">Display name</label>
            <input
              id="displayName"
              className="form-control"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Sam & Lee"
            />
          </div>
        )}
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
          {busy ? 'Please wait…' : mode === 'register' ? 'Create account & continue' : 'Log in & continue'}
        </button>
      </form>
    </div>
  );
}

export default AuthPanel;
