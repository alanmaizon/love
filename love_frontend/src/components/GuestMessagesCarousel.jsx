import React, { useRef, useEffect, useMemo } from 'react';
import { useSwipeable } from 'react-swipeable';
import './GuestMessagesCarousel.css';

function GuestMessagesCarousel({ messages, autoScrollDelay = 10000 }) {
  const carouselRef = useRef(null);

  // Function to shuffle array using Fisher-Yates algorithm
  const shuffleArray = (array) => {
    let shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Shuffle messages only once when the component mounts
  const shuffledMessages = useMemo(() => shuffleArray(messages), [messages]);

  // Auto-scrolling: Moves exactly one message at a time
  useEffect(() => {
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, clientWidth, scrollWidth } = carouselRef.current;
        const increment = clientWidth; // Moves one full message width

        if (scrollLeft + clientWidth >= scrollWidth - increment) {
          carouselRef.current.scrollLeft = 0;
        } else {
          carouselRef.current.scrollLeft += increment;
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
        userSelect: 'none',
        scrollSnapType: 'x mandatory',
        width: '100vw',
      }}
    >
      {shuffledMessages.map((msg) => (
        <div
          key={msg.id}
          style={{
            flex: '0 0 auto',
            scrollSnapAlign: 'center',
            border: '1px solid #ccc',
            padding: '1.5rem',
            borderRadius: '8px',
            minWidth: '90vw',
            minHeight: '350px',
            userSelect: 'none',
            backgroundColor: '#3d2c1e',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center'
          }}
        >
          {/* Centered Message */}
          <p style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 'bold' }}>
            {msg.message}
          </p>
        </div>
      ))}
    </div>
  );
}

export default GuestMessagesCarousel;
