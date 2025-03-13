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
            position: 'relative',         // Enable absolute positioning for bottom elements
            flex: '0 0 auto',
            marginRight: '1rem',
            border: '1px solid #ccc',
            padding: '1.5rem',
            borderRadius: '8px',
            minWidth: '250px',
            userSelect: 'none',           // Disable text selection
            backgroundColor: '#3d2c1e'      // Dark chocolate background
          }}
        >
          {/* Main Message on Top */}
          <p style={{ fontSize: '1.2rem', marginBottom: '2.5rem' }}>
            {msg.message || "No message provided."}
          </p>
          {/* Donor Name as Signature at Bottom Right */}
          <small
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              fontFamily: 'Cormorant, serif',
              fontSize: '1rem',
              fontStyle: 'italic'
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
