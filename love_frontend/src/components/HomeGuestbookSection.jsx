// src/components/HomeGuestbookSection.jsx
import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import GuestMessagesCarousel from './GuestMessagesCarousel';

function HomeGuestbookSection() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axiosInstance.get('/donations/')
      .then((response) => {
        // Filter messages to only show confirmed guest messages.
        const confirmedMessages = response.data.filter(
          (msg) => msg.status === 'confirmed'
        );
        setMessages(confirmedMessages);
      })
      .catch(() => setError('Failed to load guest messages.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading messages...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <section className="guestbook-section" style={{ padding: '4rem 1rem' }}>
      <div className="container">
        <h2>Guestbook</h2>
        <GuestMessagesCarousel messages={messages} />
      </div>
    </section>
  );
}

export default HomeGuestbookSection;
