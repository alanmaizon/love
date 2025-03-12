// src/components/PrivateRoute.jsx
import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { authUser } = useContext(AuthContext);

  // If authUser is null (not authenticated), redirect to the login page.
  return authUser ? children : <Navigate to="/login" replace />;
};

export default PrivateRoute;
