// src/components/Login.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        'http://localhost:8000/api/login/',
        { username, password },
        { withCredentials: true } // ensures session cookies are handled
      );
      setMessage(response.data.message);
      // On successful login, redirect to the profile page (or dashboard)
      navigate('/dashboard');
    } catch (error) {
      if (error.response) {
        setMessage(error.response.data.error || 'Login failed');
      } else {
        setMessage('An error occurred');
      }
    }
  };

  return (
    <div className="container mt-5">
      <h2>Login</h2>
      {message && <div className="alert alert-info">{message}</div>}
      <form onSubmit={handleLogin}>
        <div className="mb-3">
          <label htmlFor="username" className="form-label">Username</label>
          <input
            type="text"
            className="form-control"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            type="password"
            className="form-control"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary">Login</button>
      </form>
    </div>
  );
}

export default Login;
