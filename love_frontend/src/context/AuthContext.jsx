// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  /** False until the initial /me/ check finishes (avoids PrivateRoute flash to /login). */
  const [authReady, setAuthReady] = useState(false);
  // The flagship (default public) campaign — replaces the old single Profile.
  const [campaign, setCampaign] = useState(null);

  // Sync login/logout across open tabs.
  useEffect(() => {
    const channel = new BroadcastChannel('auth_channel');
    channel.onmessage = (e) => {
      if (e.data.type === 'LOGOUT') setAuthUser(null);
      else if (e.data.type === 'LOGIN') setAuthUser(e.data.payload);
    };
    return () => channel.close();
  }, []);

  // Authenticated session check (v2: /me/, not /profile/).
  useEffect(() => {
    if (localStorage.getItem('loggedOut')) {
      setAuthUser(null);
      setAuthReady(true);
      return;
    }
    const loadMe = () =>
      axiosInstance.get('/me/')
        .then((res) => {
          if (res.data?.authenticated) {
            setAuthUser({
              username: res.data.username,
              displayName: res.data.display_name,
              isAdmin: res.data.isAdmin,
              charities: res.data.charities || [],
              email: res.data.email || '',
              emailVerified: res.data.email_verified,
              emailVerificationRequired: res.data.email_verification_required,
            });
          } else {
            setAuthUser(null);
          }
        })
        .catch(() => setAuthUser(null))
        .finally(() => setAuthReady(true));

    axiosInstance.get('/csrf/').catch(() => {}).finally(loadMe);
  }, []);

  // Public flagship campaign (v2: /campaign/, not /public_profile/).
  useEffect(() => {
    axiosInstance.get('/campaign/')
      .then((res) => setCampaign(res.data))
      .catch(() => setCampaign(null));
  }, []);

  // Backward-compatible view for existing wedding-display components
  // (CoupleSection/BioShort/CountdownTimer read bride_name/groom_name/etc).
  const publicProfile = campaign
    ? (() => {
        const host = campaign.host_display_name || campaign.title || '';
        const [brideName = host, groomName = ''] = host.split(' & ');
        return {
          bride_name: brideName,
          groom_name: groomName,
          bio: campaign.story || '',
          location: campaign.location || '',
          wedding_date: campaign.event_date || null,
          profile_picture_url: campaign.cover_image_url || '',
          isPublic: true,
        };
      })()
    : null;

  return (
    <AuthContext.Provider value={{ authUser, authReady, setAuthUser, campaign, publicProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
