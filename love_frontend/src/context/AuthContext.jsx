import React, { createContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Fetch public profile info instead of the protected one.
    axiosInstance.get('/public_profile/')
      .then((res) => {
        // Compute a display name based on public profile info
        const displayName = `${res.data.bride_name} & ${res.data.groom_name}`;
        setUser({ username: displayName, ...res.data });
      })
      .catch((err) => {
        // 403 is expected for non-authenticated users on /profile/
        setUser(null);
      });
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
