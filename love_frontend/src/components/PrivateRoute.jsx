// src/components/PrivateRoute.jsx
import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

const PrivateRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    // Try to fetch the profile; if it succeeds, the user is authenticated.
    axiosInstance.get('/profile/')
      .then(response => {
        setIsAuthenticated(true);
      })
      .catch(error => {
        setIsAuthenticated(false);
      });
  }, []);

  if (isAuthenticated === null) {
    // While checking, you can display a loading indicator
    return <div>Loading...</div>;
  }

  // If authenticated, render the protected component; otherwise redirect to login.
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
