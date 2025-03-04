// src/components/Logout.jsx
import React, { useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    // Call a logout endpoint if available, or simply clear any client-side session data.
    axios.post('http://localhost:8000/api/logout/', {}, { withCredentials: true })
      .catch(error => {
        // Optionally handle error if needed
        console.error('Logout error:', error);
      })
      .finally(() => {
        // Redirect to the login page after logout
        navigate('/login');
      });
  }, [navigate]);

  return <div>Logging out...</div>;
}

export default Logout;
