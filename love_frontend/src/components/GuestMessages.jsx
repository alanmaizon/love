import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import GuestMessagesCarousel from './GuestMessagesCarousel';

// v2: approved guest messages from the moderated API (not the static CSV).
function GuestMessages() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    axiosInstance.get('/messages/?campaign=anna-and-alan')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setMessages(
          list
            .filter((m) => m.body && m.body.trim() !== '')
            .map((m) => ({ donor_name: m.display_name, message: m.body })),
        );
      })
      .catch((error) => console.error('Error loading messages:', error));
  }, []);

  return (
    <div className="container mt-5">
      <h2 className="text-center mb-4">Guest Messages</h2>
      <GuestMessagesCarousel messages={messages} />
    </div>
  );
}

export default GuestMessages;
