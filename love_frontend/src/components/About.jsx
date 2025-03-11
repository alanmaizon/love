import React from 'react';
import image1 from '../../public/image1.png';
import image2 from '../../public/image2.png';

function Bio() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '50px 20px' }}>
      {/* Flex Container for Top Section */}
      <div className="bio-top-section">
        {/* Images Section */}
        <div className="bio-images" style={{ position: 'relative' }}>
          <img
            src={image1}
            alt="Our Journey"
            style={{
              width: '100%',
              maxWidth: '480px',
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
              maxWidth: '360px',
              position: 'absolute',
              top: '150px',
              right: 0,
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
              borderRadius: '8px',
              transform: 'rotate(10deg)'
            }}
          />
        </div>

        {/* Text Section */}
        <div className="bio-text" style={{ color: '#EAD7BB' }}>
          <h1 style={{ color: '#EAD7BB' }}>About Us</h1>
          <p style={{ color: '#EAD7BB' }}>
            Welcome to our story. Here you'll learn about our journey, our love, and our dreams.
            We hope our story inspires you as much as your support inspires us.
          </p>
        </div>
      </div>

      {/* Additional Text Section */}
      <div
        style={{
          backgroundColor: '#3D2C1E',
          borderRadius: '8px',
          padding: '2rem',
          color: '#EAD7BB',
          lineHeight: '1.6'
        }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: '1rem', marginTop: '2rem' }}>
          The Greatest Gift is Your Love and Presence
        </h2>
        <p>
          Our journey together has been one of love, laughter, and countless unforgettable moments.
          From the first time we met to the adventures we've shared, every step has brought us closer
          to this incredible milestone. On April 26, 2025, we will say "I do" and begin a new chapter as
          husband and wife, surrounded by the people who mean the most to us.
        </p>
        <p>
          Your love, support, and presence on our wedding day are the greatest gifts we could ever receive.
          However, if you wish to contribute in another way, we have created this space with meaningful options.
          Instead of traditional gifts, we want our marriage to be an opportunity to give back. That's why we
          have chosen three charitable organizations that inspire us and reflect the values we share. Any donation,
          big or small, will be a beautiful way to celebrate our union.
        </p>
        <p>
          Thank you for being part of our journey and for helping us make love something that extends beyond
          our special day.
        </p>
        <p style={{ textAlign: 'right', fontStyle: 'italic' }}>
          With love,<br />Alan &amp; Anna
        </p>
      </div>
    </div>
  );
}

export default Bio;
