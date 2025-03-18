import React, { useRef, useEffect, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import 'bootstrap/dist/css/bootstrap.min.css'; // Ensure Bootstrap is imported

function GuestMessagesCarousel({ messages, autoScrollDelay = 10000 }) {
  const carouselRef = useRef(null);
  const [shuffledMessages, setShuffledMessages] = useState([]);

  useEffect(() => {
    // Filter and shuffle messages
    const validMessages = messages.filter(msg => msg.message && msg.message.trim() !== '');
    setShuffledMessages([...validMessages].sort(() => Math.random() - 0.5));
  }, [messages]);

  useEffect(() => {
    if (shuffledMessages.length === 0) return;
    
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, clientWidth, scrollWidth } = carouselRef.current;
        const increment = clientWidth / 2;
        carouselRef.current.scrollLeft = (scrollLeft + clientWidth >= scrollWidth - increment) 
          ? 0 
          : scrollLeft + increment;
      }
    }, autoScrollDelay);

    return () => clearInterval(interval);
  }, [autoScrollDelay, shuffledMessages]);

  const handlers = useSwipeable({
    onSwipedLeft: () => { if (carouselRef.current) carouselRef.current.scrollLeft += carouselRef.current.clientWidth / 2; },
    onSwipedRight: () => { if (carouselRef.current) carouselRef.current.scrollLeft -= carouselRef.current.clientWidth / 2; },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  return (
    <div {...handlers} ref={carouselRef} className="d-flex overflow-auto p-3" style={{ scrollBehavior: 'smooth', gap: '1rem', whiteSpace: 'nowrap' }}>
      {shuffledMessages.length > 0 ? (
        shuffledMessages.map((msg) => (
          <div key={msg.id} className="d-flex flex-column justify-content-center align-items-center text-center border rounded p-3 bg-dark text-light"
               style={{ flex: '0 0 auto', width: '300px', height: '300px' }}>
            <p className="mb-3 fs-5">{msg.message}</p>
            <small className="text-muted">Gifted on {new Date(msg.created_at).toLocaleDateString()}</small>
            <small className="fw-bold">{msg.donor_name}</small>
          </div>
        ))
      ) : (
        <p className="text-white text-center w-100">No guest messages available.</p>
      )}
    </div>
  );
}

export default GuestMessagesCarousel;
