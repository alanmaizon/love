import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import GuestMessagesCarousel from './GuestMessagesCarousel';

function HomeGuestbookSection() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/data/donations.csv')
      .then((response) => {
        if (!response.ok) throw new Error('Failed to fetch CSV');
        return response.text();
      })
      .then((csvText) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const confirmedMessages = results.data.filter(
              (msg) => msg.status.toLowerCase() === 'confirmed'
            );
            setMessages(confirmedMessages);
            setLoading(false);
          },
          error: () => {
            setError('Failed to parse CSV.');
            setLoading(false);
          }
        });
      })
      .catch(() => {
        setError('Failed to load guest messages.');
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading messages...</p>;
  if (error) return <p className="text-danger">{error}</p>;

  return (
    <section className="guestbook-section">
      <div className="container">
        <GuestMessagesCarousel messages={messages} />
      </div>
    </section>
  );
}

export default HomeGuestbookSection;
