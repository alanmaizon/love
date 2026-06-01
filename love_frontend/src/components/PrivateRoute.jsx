// src/components/PrivateRoute.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { authUser, authReady } = useContext(AuthContext);

  if (!authReady) {
    return <div className="container mt-5">Loading…</div>;
  }
  return authUser ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
