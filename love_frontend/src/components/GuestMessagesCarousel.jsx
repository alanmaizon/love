// src/components/GuestMessagesCarousel.jsx
import React, { useRef, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import './GuestMessagesCarousel.css'; // Ensure this file is imported

function GuestMessagesCarousel({ messages, autoScrollDelay = 10000 }) {
  const carouselRef = useRef(null);

  // Auto-scrolling setup
  useEffect(() => {
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, clientWidth, scrollWidth } = carouselRef.current;
        // Reset to beginning if reached end
        if (scrollLeft + clientWidth >= scrollWidth) {
          carouselRef.current.scrollLeft = 0;
        } else {
          carouselRef.current.scrollLeft += clientWidth;
        }
      }
    }, autoScrollDelay);

    return () => clearInterval(interval);
  }, [autoScrollDelay]);

  // Swipe handlers using react-swipeable
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (carouselRef.current) {
        carouselRef.current.scrollLeft += carouselRef.current.clientWidth;
      }
    },
    onSwipedRight: () => {
      if (carouselRef.current) {
        carouselRef.current.scrollLeft -= carouselRef.current.clientWidth;
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
        userSelect: 'none' // disables text selection
      }}
    >
      {messages.map((msg) => (
        <div
          key={msg.id}
          style={{
            flex: '0 0 auto',
            marginRight: '1rem',
            border: '1px solid #ccc',
            padding: '1rem',
            borderRadius: '4px',
            minWidth: '250px',
            userSelect: 'none', // disable text selection inside card
            backgroundColor: '#3d2c1e' // updated background color
          }}
        >
          <h5 style={{ fontFamily: 'Cormorant, serif', margin: 0 }}>
            {msg.donor_name}
          </h5>
          <p style={{ fontSize: '1.2rem' }}>
            {msg.message || "No message provided."}
          </p>
          <small style={{ fontFamily: 'Cormorant, serif' }}>
            Gifted on {new Date(msg.created_at).toLocaleDateString()}
          </small>
        </div>
      ))}
    </div>
  );
}

export default GuestMessagesCarousel;
