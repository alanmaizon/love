import React, { createContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    axiosInstance.get('/profile/')
      .then((res) => {
        // Compute display name from the profile data.
        const displayName = `${res.data.bride_name} & ${res.data.groom_name}`;
        setUser({ username: displayName, ...res.data });
      })
      .catch(() => {
        setUser(null);
      });
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
