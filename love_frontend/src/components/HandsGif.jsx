// src/components/HandsGif.jsx
import React, { useRef, useState, useEffect } from 'react';
import hands from '../../public/hands.gif';

function HandsGif() {
  const [visible, setVisible] = useState(false);
  const gifRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries, observerInstance) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observerInstance.disconnect(); // Trigger only once
          }
        });
      },
      { threshold: 0.5 }
    );
    if (gifRef.current) {
      observer.observe(gifRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={gifRef}
      style={{
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {visible && (
        <img
          src={hands}
          alt="Hands Gif"
          style={{ width: '100%', height: '100%'}}
        />
      )}
    </div>
  );
}

export default HandsGif;
