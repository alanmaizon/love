// src/components/GuestMessagesCarousel.jsx
import React, { useRef, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import './GuestMessagesCarousel.css';

function GuestMessagesCarousel({ messages, autoScrollDelay = 10000 }) {
  const carouselRef = useRef(null);

  // Set up auto-scrolling vertically
  useEffect(() => {
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollTop, clientHeight, scrollHeight } = carouselRef.current;
        if (scrollTop + clientHeight >= scrollHeight) {
          carouselRef.current.scrollTop = 0;
        } else {
          carouselRef.current.scrollTop += clientHeight;
        }
      }
    }, autoScrollDelay);
    return () => clearInterval(interval);
  }, [autoScrollDelay]);

  // Set up vertical swipe handlers using react-swipeable
  const handlers = useSwipeable({
    onSwipedUp: () => {
      if (carouselRef.current) {
        carouselRef.current.scrollTop += carouselRef.current.clientHeight;
      }
    },
    onSwipedDown: () => {
      if (carouselRef.current) {
        carouselRef.current.scrollTop -= carouselRef.current.clientHeight;
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
        flexDirection: 'column',
        overflowY: 'auto',
        scrollBehavior: 'smooth',
        padding: '1rem',
        cursor: 'grab',
        userSelect: 'none'
      }}
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            position: 'relative',
            flex: '0 0 auto',
            marginBottom: '1rem',
            backgroundColor: '#3d2c1e',
            fontFamily: "'Cormorant', serif",
            color: '#EAD7BB',
            padding: '1.5rem',
            borderRadius: '8px',
            minHeight: '150px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            userSelect: 'none'
          }}
        >
          {/* Main Message */}
          <p style={{ fontSize: '1.5rem', margin: '0 0 2rem 0' }}>
            {msg.message || "No message provided."}
          </p>
          {/* Date at bottom left */}
          <small
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              fontSize: '0.8rem'
            }}
          >
            {new Date(msg.created_at).toLocaleDateString()}
          </small>
          {/* Donor Name at bottom right */}
          <small
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              fontSize: '1rem'
            }}
          >
            {msg.donor_name}
          </small>
        </div>
      ))}
    </div>
  );
}

export default GuestMessagesCarousel;
