import React from 'react';
import image1 from '../../public/image1.png';
import image2 from '../../public/image2.png';

function Bio() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '50px',
        gap: '2rem'
      }}
    >
      {/* Images Section */}
      <div
        style={{
          position: 'relative',
          width: '480px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <img
          src={image1}
          alt="Our Journey"
          style={{
            width: '100%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            borderRadius: '8px',
            transform: 'rotate(-10deg)'
          }}
        />
        <img
          src={image2}
          alt="Our Love"
          style={{
            width: '80%',
            alignSelf: 'flex-end',
            marginTop: '-150px', // negative margin to overlap image1
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            borderRadius: '8px',
            transform: 'rotate(10deg)'
          }}
        />
      </div>

      {/* Text Section */}
      <div style={{ flex: 1 }}>
        <h1 style={{ color: '#EAD7BB' }}>About Us</h1>
        <p style={{ color: '#EAD7BB' }}>
          Welcome to our story. Here you'll learn about our journey, our love, and our dreams.
          We hope our story inspires you as much as your support inspires us.
        </p>
      </div>
    </div>
  );
}

export default Bio;
