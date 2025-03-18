import React, { useRef, useEffect, useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import 'bootstrap/dist/css/bootstrap.min.css'; // Ensure Bootstrap is imported

function GuestMessagesCarousel({ messages, autoScrollDelay = 10000 }) {
  const carouselRef = useRef(null);
  const [shuffledMessages, setShuffledMessages] = useState([]);

  useEffect(() => {
    const validMessages = messages.filter(msg => msg.message && msg.message.trim() !== '');
    setShuffledMessages([...validMessages].sort(() => Math.random() - 0.5));
  }, [messages]);

  useEffect(() => {
    if (shuffledMessages.length === 0) return;
    
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, clientWidth } = carouselRef.current;
        carouselRef.current.scrollLeft += clientWidth; // Moves exactly one card width
        if (carouselRef.current.scrollLeft + clientWidth >= carouselRef.current.scrollWidth) {
          carouselRef.current.scrollLeft = 0; // Reset to first item when reaching end
        }
      }
    }, autoScrollDelay);

    return () => clearInterval(interval);
  }, [autoScrollDelay, shuffledMessages]);

  const handlers = useSwipeable({
    onSwipedLeft: () => { if (carouselRef.current) carouselRef.current.scrollLeft += carouselRef.current.clientWidth; },
    onSwipedRight: () => { if (carouselRef.current) carouselRef.current.scrollLeft -= carouselRef.current.clientWidth; },
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  return (
    <div className="container">
      <div className="row flex-nowrap overflow-auto" {...handlers} ref={carouselRef} 
           style={{ scrollSnapType: 'x mandatory', scrollBehavior: 'smooth', gap: '1rem' }}>
        {shuffledMessages.length > 0 ? (
          shuffledMessages.map((msg) => (
            <div key={msg.id} className="col-md-4 col-lg-3 d-flex justify-content-center"
                 style={{ flex: '0 0 auto', scrollSnapAlign: 'start' }}>
              <div className="card text-center border rounded p-3 bg-dark text-light w-100">
                <p className="mb-3 fs-5">{msg.message}</p>
                <small className="text-muted">Gifted on {new Date(msg.created_at).toLocaleDateString()}</small>
                <small className="fw-bold">{msg.donor_name}</small>
              </div>
            </div>
          ))
        ) : (
          <p className="text-white text-center w-100">No guest messages available.</p>
        )}
      </div>
    </div>
  );
}

export default GuestMessagesCarousel;
