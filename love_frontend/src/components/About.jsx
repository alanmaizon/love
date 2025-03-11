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
        <h1 style={{ color: '#EAD7BB' }}>The Greatest Gift is Your Love and Presence</h1>
        <p style={{ color: '#EAD7BB' }}>
          Welcome to our story. Here you'll learn about our journey, our love, and our dreams.
          We hope our story inspires you as much as your support inspires us.
        </p>
        <p style={{ color: '#EAD7BB' }}>
        On April 26, 2025, we will be celebrating one of the most special days of our lives, and we feel incredibly grateful to share it with you. Your love, support, and presence at our wedding are the greatest gifts we could ever receive.
        If you'd like to contribute in another way, we have created this space with meaningful options. Instead of traditional gifts, we want our union to be an opportunity to give back. That’s why we have chosen three charitable organizations that inspire us and reflect the values we share. Any donation, big or small, will be a beautiful gesture of love in honor of our wedding.
        Thank you for being part of our journey and for helping us make love something that extends beyond our special day.
        With love,
        <em>Alan & Anna</em>
        </p>
      </div>
    </div>
  );
}

export default Bio;
