// src/components/GuestMessagesCarousel.jsx
import React, { useRef, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import './GuestMessagesCarousel.css'; // Make sure this file is imported

function GuestMessagesCarousel({ messages, autoScrollDelay = 3000 }) {
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
            flex: '0 0 auto',
            marginRight: '1rem',
            border: '1px solid #ccc',
            padding: '1rem',
            borderRadius: '4px',
            minWidth: '250px',
            userSelect: 'none' // disable text selection inside card
          }}
        >
          <h5>{msg.donor_name}</h5>
          <p>{msg.message || "No message provided."}</p>
          <small>Gifted on {new Date(msg.created_at).toLocaleDateString()}</small>
        </div>
      ))}
    </div>
  );
}

export default GuestMessagesCarousel;
