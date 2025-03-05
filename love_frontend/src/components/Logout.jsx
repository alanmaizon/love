// src/components/Logout.jsx
import React, { useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';

function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    // Call the logout endpoint using the axios instance
    axiosInstance.post('/logout/', {}, { withCredentials: true })
      .catch(error => {
        console.error('Logout error:', error);
      })
      .finally(() => {
        navigate('/login');
      });
  }, [navigate]);

  return <div>Logging out...</div>;
}

export default Logout;
