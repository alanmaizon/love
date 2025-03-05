// src/components/Logout.jsx
import React, { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';

function Logout() {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  useEffect(() => {
    axiosInstance.post('/logout/', {}, { withCredentials: true })
      .then(() => {
        // Clear the user from context
        setUser(null);
        // Show a confirmation toast
        toast.info('Logged out successfully!');
      })
      .catch((error) => {
        console.error('Logout error:', error);
        toast.error('An error occurred while logging out.');
      })
      .finally(() => {
        // Navigate to login or home
        navigate('/login');
      });
  }, [navigate, setUser]);

  return <div>Logging out...</div>;
}

export default Logout;
