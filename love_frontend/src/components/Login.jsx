import React, { useState, useContext } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { toast } from 'react-toastify';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // 1. Post to /login
      await axiosInstance.post('/login/', { username, password });
      toast.success('Login successful!');

      // 2. Fetch user profile
      const profileRes = await axiosInstance.get('/profile/');
      const displayName = `${profileRes.data.bride_name} & ${profileRes.data.groom_name}`;
      setUser({ username: displayName, ...profileRes.data });

      // 3. Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      if (error.response) {
        toast.error(error.response.data.error || 'Login failed');
      } else {
        toast.error('An error occurred');
      }
    }
  };

  return (
    <div className="container mt-5">
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div className="mb-3">
          <label htmlFor="username" className="form-label">Username</label>
          <input type="text" className="form-control" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label htmlFor="password" className="form-label">Password</label>
          <input type="password" className="form-control" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-primary">Login</button>
      </form>
    </div>
  );
}

export default Login;
