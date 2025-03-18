import React, { useRef, useEffect, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import './GuestMessagesCarousel.css'; // Import the updated CSS file

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
        const increment = carouselRef.current?.querySelector('.card-square')?.offsetWidth || clientWidth / 2;
        
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
    >
      {shuffledMessages.length > 0 ? (
        shuffledMessages.map((msg) => (
          <div key={msg.id} className="card-square">
            {/* Main Message Centered */}
            <p className="card-message">{msg.message}</p>
            {/* Date at Bottom Left */}
            <small className="card-date">
              Gifted on {new Date(msg.created_at).toLocaleDateString()}
            </small>
            {/* Donor Name as Signature at Bottom Right */}
            <small className="card-signature">{msg.donor_name}</small>
          </div>
        ))
      ) : (
        <p className="card-message" style={{ color: '#fff' }}>
          No guest messages available.
        </p>
      )}
    </div>
  );
}

export default GuestMessagesCarousel;
