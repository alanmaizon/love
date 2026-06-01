import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import GuestMessagesCarousel from './GuestMessagesCarousel';
import { AuthContext } from '../context/AuthContext';

// v2: approved guest messages from the moderated API (not the static CSV).
function GuestMessages() {
  const [messages, setMessages] = useState([]);
  const [searchParams] = useSearchParams();
  const { campaign: flagship } = useContext(AuthContext) ?? {};
  const campaignSlug = searchParams.get('campaign') || flagship?.slug;

  useEffect(() => {
    if (!campaignSlug) return undefined;
    axiosInstance.get(`/messages/?campaign=${encodeURIComponent(campaignSlug)}`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setMessages(
          list
            .filter((m) => m.body && m.body.trim() !== '')
            .map((m) => ({ donor_name: m.display_name, message: m.body })),
        );
      })
      .catch((error) => console.error('Error loading messages:', error));
  }, [campaignSlug]);

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">Guest Messages</h2>
      <GuestMessagesCarousel messages={messages} />
    </div>
  );
}

export default GuestMessages;
