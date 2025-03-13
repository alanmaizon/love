// src/components/GuestMessagesCarousel.jsx
import React, { useRef } from 'react';
import { useSwipeable } from 'react-swipeable';

function GuestMessagesCarousel({ messages }) {
  const carouselRef = useRef(null);

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
    trackMouse: true, // allows swipe with mouse events too
  });

  return (
    <div
      {...handlers}
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
  );
}

export default GuestMessagesCarousel;
