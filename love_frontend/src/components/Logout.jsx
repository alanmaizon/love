// src/components/Logout.jsx
import React, { useEffect, useContext } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Logout() {
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);

  useEffect(() => {
    axiosInstance.post('/logout/', {})
      .catch(error => {
        console.error('Logout error:', error);
      })
      .finally(() => {
        setUser(null);
        navigate('/');
      });
  }, [navigate, setUser]);

  return <div>Logging out...</div>;
}

export default Logout;
