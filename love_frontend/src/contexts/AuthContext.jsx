import React, { createContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

// Create the AuthContext
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); 
  // user will store e.g. { username: 'anna' } or something

  // Optionally, fetch user info on mount (to persist login between refreshes)
  useEffect(() => {
    // Example: if session cookie is present, we can fetch the profile
    axiosInstance.get('/profile/')
      .then((res) => {
        // Might contain bride_name, groom_name, or username
        setUser({ username: res.data.user_username, ...res.data });
      })
      .catch(() => {
        // Not logged in or 403
        setUser(null);
      });
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
