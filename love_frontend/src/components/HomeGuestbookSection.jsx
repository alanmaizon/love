import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import GuestMessagesCarousel from './GuestMessagesCarousel';

// v2: guest messages come from the moderated API (approved only), not the static
// CSV. Mapped to the {donor_name, message} shape GuestMessagesCarousel expects.
function HomeGuestbookSection({ campaignSlug }) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!campaignSlug) return undefined;
    axiosInstance.get(`/messages/?campaign=${encodeURIComponent(campaignSlug)}`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setMessages(
          list
            .filter((m) => m.body && m.body.trim() !== '')
            .map((m) => ({
              donor_name: m.display_name,
              message: m.body,
              // "Gifted on" date — published_at carries the original gift date
              // for seeded history; created_at for live messages.
              created_at: m.published_at || m.created_at,
            })),
        );
      })
      .catch((error) => console.error('Error loading messages:', error));
  }, [campaignSlug]);

  return <GuestMessagesCarousel messages={messages} />;
}

export default HomeGuestbookSection;
