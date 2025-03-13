// src/components/GuestMessagesCarousel.jsx
import React, { useRef, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import './GuestMessagesCarousel.css'; // Make sure this file is imported

function GuestMessagesCarousel({ messages, autoScrollDelay = 10000 }) {
  const carouselRef = useRef(null);

  // Set up auto-scrolling
  useEffect(() => {
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, clientWidth, scrollWidth } = carouselRef.current;
        // If we've reached the end, reset to beginning
        if (scrollLeft + clientWidth >= scrollWidth) {
          carouselRef.current.scrollLeft = 0;
        } else {
          carouselRef.current.scrollLeft += clientWidth;
        }
      }
    }, autoScrollDelay);

    return () => clearInterval(interval);
  }, [autoScrollDelay]);

  // Set up swipe handlers using react-swipeable
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
            position: 'relative',         // Enable absolute positioning for footer elements
            flex: '0 0 auto',
            marginRight: '1rem',
            backgroundColor: '#4b2e2e',     // Dark chocolate color
            color: '#EAD7BB',              // Text color
            padding: '1.5rem',
            borderRadius: '8px',
            minWidth: '250px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            userSelect: 'none'             // Disable text selection
          }}
        >
          {/* Main Message */}
          <p style={{ fontSize: '1.5rem', margin: '0 0 2rem 0' }}>
            {msg.message || "No message provided."}
          </p>
          {/* Date at bottom left */}
          <small style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            fontSize: '0.8rem'
          }}>
            {new Date(msg.created_at).toLocaleDateString()}
          </small>
          {/* Donor Name at bottom right */}
          <small style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            fontSize: '1rem'
          }}>
            {msg.donor_name}
          </small>
        </div>
      ))}
    </div>
  );
}

export default GuestMessagesCarousel;
