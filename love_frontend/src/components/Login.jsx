// src/components/Login.jsx
import React, { useState, useContext } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const { setAuthUser } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/login/', { username, password });
      // Remove logout flag
      localStorage.removeItem('loggedOut');

      // Get profile after login
      const profileRes = await axiosInstance.get('/profile/');
      const displayName = `${profileRes.data.bride_name} & ${profileRes.data.groom_name}`;
      const newAuthUser = { username: displayName, ...profileRes.data };

      // Updates states
      setAuthUser(newAuthUser);

      // Send event between tabs
      const channel = new BroadcastChannel('auth_channel');
      channel.postMessage({ type: 'LOGIN', payload: newAuthUser });
      channel.close();

      navigate('/dashboard');
    } catch (error) {
      if (error.response) {
        setErrorMsg(error.response.data.error || 'Login failed');
      } else {
        setErrorMsg('An error occurred');
      }
    }
  };

  return (
    <div className="container mt-5">
      {errorMsg && <div className="alert alert-danger">{errorMsg}</div>}
      <form onSubmit={handleLogin}>
        <h2>Login</h2>
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
