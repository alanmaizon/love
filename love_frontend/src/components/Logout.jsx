// src/components/Logout.jsx
import React, { useEffect, useContext } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Logout() {
  const navigate = useNavigate();
  const { setAuthUser } = useContext(AuthContext);

  useEffect(() => {
    axiosInstance.post('/logout/', {})
      .catch(error => {
        console.error('Logout error:', error);
      })
      .finally(() => {
        // Clean user state
        setAuthUser(null);
        // Save localStorage when logout
        localStorage.setItem('loggedOut', 'true');
        // Sent message to all tabs to sync
        const channel = new BroadcastChannel('auth_channel');
        channel.postMessage({ type: 'LOGOUT' });
        channel.close();
        navigate('/');
      });
  }, [navigate, setAuthUser]);

  return <div>Logging out...</div>;
}

export default Logout;
