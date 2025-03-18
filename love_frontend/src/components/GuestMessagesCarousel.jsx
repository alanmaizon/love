import React, { useRef, useEffect, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import './GuestMessagesCarousel.css'; // Ensure this file is imported

function GuestMessagesCarousel({ messages, autoScrollDelay = 10000 }) {
  const carouselRef = useRef(null);
  const [shuffledMessages, setShuffledMessages] = useState([]);

  useEffect(() => {
    // Filter out empty messages before shuffling
    const validMessages = messages.filter(
      (msg) => msg.message && msg.message.trim() !== ''
    );
    // Shuffle messages
    const shuffled = [...validMessages].sort(() => Math.random() - 0.5);
    setShuffledMessages(shuffled);
  }, [messages]);

  // Auto-scrolling setup: scroll by half the container's width for a smoother effect
  useEffect(() => {
    if (shuffledMessages.length === 0) return;

    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, clientWidth, scrollWidth } = carouselRef.current;
        const increment = clientWidth / 2;
        if (scrollLeft + clientWidth >= scrollWidth - increment) {
          carouselRef.current.scrollLeft = 0;
        } else {
          carouselRef.current.scrollLeft += increment;
        }
      }
    }, autoScrollDelay);

    return () => clearInterval(interval);
  }, [autoScrollDelay, shuffledMessages]);

  // Swipe handlers using react-swipeable
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (carouselRef.current) {
        carouselRef.current.scrollLeft += carouselRef.current.clientWidth / 2;
      }
    },
    onSwipedRight: () => {
      if (carouselRef.current) {
        carouselRef.current.scrollLeft -= carouselRef.current.clientWidth / 2;
      }
    },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  return (
    <div
      {...handlers}
      ref={carouselRef}
      className="guest-messages-carousel no-scrollbar"
      style={{
        display: 'flex',
        overflowX: 'auto',
        scrollBehavior: 'smooth',
        padding: '1rem',
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      {shuffledMessages.length > 0 ? (
        shuffledMessages.map((msg) => (
          <div
            key={msg.id}
            style={{
              position: 'relative', // for absolute positioning of footer elements
              flex: '0 0 auto',
              marginRight: '1rem',
              border: '1px solid #ccc',
              padding: '1.5rem',
              borderRadius: '8px',
              width: '250px',
              minHeight: '350px', // increased height for a taller card
              userSelect: 'none', // disable text selection
              backgroundColor: '#3d2c1e', // dark chocolate background
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center', // Center the message vertically
              alignItems: 'center', // Center the message horizontally
              textAlign: 'center',
            }}
          >
            {/* Main Message Centered */}
            <p style={{ fontSize: '1.2rem', marginBottom: '2rem', maxWidth: '90%' }}>
              {msg.message}
            </p>
            {/* Date at Bottom Left */}
            <small
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                fontFamily: 'Cormorant, serif',
                fontSize: '0.8rem',
              }}
            >
              Gifted on {new Date(msg.created_at).toLocaleDateString()}
            </small>
            {/* Donor Name as Signature at Bottom Right */}
            <small
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                fontFamily: 'Cormorant, serif',
                fontSize: '1rem',
                fontStyle: 'italic',
              }}
            >
              {msg.donor_name}
            </small>
          </div>
        ))
      ) : (
        <p style={{ textAlign: 'center', fontSize: '1.2rem', color: '#fff' }}>
          No guest messages available.
        </p>
      )}
    </div>
  );
}

export default GuestMessagesCarousel;