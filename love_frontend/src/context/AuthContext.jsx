// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [publicProfile, setPublicProfile] = useState(null);

  useEffect(() => {
    const channel = new BroadcastChannel('auth_channel');
    channel.onmessage = (e) => {
      if (e.data.type === 'LOGOUT') {
        setAuthUser(null);
      } else if (e.data.type === 'LOGIN') {
        setAuthUser(e.data.payload);
      }
    };
    return () => {
      channel.close();
    };
  }, []);

  useEffect(() => {
    const loggedOut = localStorage.getItem('loggedOut');
    if (!loggedOut) {
      axiosInstance.get('/public_profile/')
        .then((res) => {
          const profileData = { ...res.data, isPublic: true };
          setPublicProfile(profileData);
        })
        .catch(() => {
          setPublicProfile(null);
        });
    } else {
      setPublicProfile(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ authUser, setAuthUser, publicProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
