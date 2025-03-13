// src/components/GuestMessagesCarousel.jsx
import React, { useRef } from 'react';
import Hammer from 'react-hammerjs';

function GuestMessagesCarousel({ messages }) {
  const carouselRef = useRef(null);

  // Handle swipe events. Hammer.js returns a direction code.
  // Hammer.DIRECTION_LEFT = 2 and Hammer.DIRECTION_RIGHT = 4.
  const handleSwipe = (e) => {
    if (!carouselRef.current) return;

    const container = carouselRef.current;
    const scrollAmount = container.clientWidth; // scroll one container width at a time

    if (e.direction === 2) { // Swipe left -> scroll right
      container.scrollLeft += scrollAmount;
    } else if (e.direction === 4) { // Swipe right -> scroll left
      container.scrollLeft -= scrollAmount;
    }
  };

  return (
    <Hammer onSwipe={handleSwipe}>
      <div
        ref={carouselRef}
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          padding: '1rem',
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
            }}
          >
            <h5>{msg.donor_name}</h5>
            <p>{msg.message || "No message provided."}</p>
            <small>Gifted on {new Date(msg.created_at).toLocaleDateString()}</small>
          </div>
        ))}
      </div>
    </Hammer>
  );
}

export default GuestMessagesCarousel;
