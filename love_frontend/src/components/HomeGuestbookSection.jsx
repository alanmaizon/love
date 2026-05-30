import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import GuestMessagesCarousel from './GuestMessagesCarousel';

// v2: guest messages come from the moderated API (approved only), not the static
// CSV. Mapped to the {donor_name, message} shape GuestMessagesCarousel expects.
function HomeGuestbookSection() {
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

  return <GuestMessagesCarousel messages={messages} />;
}

export default HomeGuestbookSection;
