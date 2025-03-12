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
        setAuthUser(null);
        localStorage.setItem('loggedOut', 'true');
        const channel = new BroadcastChannel('auth_channel');
        channel.postMessage({ type: 'LOGOUT' });
        channel.close();
        navigate('/');
      });
  }, [navigate, setAuthUser]);

  return <div>Logging out...</div>;
}

export default Logout;
