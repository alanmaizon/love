import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import './Home.css';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token.');
      return;
    }
    axiosInstance
      .post('/verify-email/', { token })
      .then((res) => {
        setStatus('ok');
        setMessage(res.data?.message || 'Email verified.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification failed.');
      });
  }, [searchParams]);

  return (
    <div className="onboarding-page">
      <h2>Email verification</h2>
      <div className="onboarding-panel">
        {status === 'loading' && <p>Verifying…</p>}
        {status === 'ok' && (
          <>
            <div className="alert alert-success">{message}</div>
            <Link to="/dashboard" className="btn btn-primary">Go to dashboard</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="alert alert-danger">{message}</div>
            <p className="mt-3">
              Log in and use <strong>Resend verification email</strong> on your dashboard.
            </p>
            <Link to="/login" className="btn btn-outline-primary">Log in</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyEmail;
