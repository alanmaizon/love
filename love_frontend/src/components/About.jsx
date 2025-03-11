import React from 'react';
import image1 from '../../public/image1.png';
import image2 from '../../public/image2.png';

function Bio() {
  return (
    <div
      style={{
        position: 'relative',
        width: '1200px',
        height: '1600px',
        margin: '0 auto',
        padding: '20px'
      }}
    >
      {/* About Us section as the background card */}
      <section
        style={{
          position: 'absolute',
          width: '875px',
          height: '542px',
          left: '250px',
          top: '761px',
          backgroundColor: '#fff',
          padding: '20px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          borderRadius: '8px',
          zIndex: 1
        }}
      >
        <h1 style={{ color: '#3D2C1E' }}>About Us</h1>
        <p style={{ color: '#3D2C1E' }}>
          Welcome to our story. Here you'll learn about our journey, our love, and our dreams. We hope our story inspires you as much as your support inspires us.
        </p>
      </section>

      {/* Image 1 card */}
      <img
        src={image1}
        alt="Our Journey"
        style={{
          position: 'absolute',
          width: '384px',
          height: '392px',
          left: '250px',
          top: '761px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          borderRadius: '8px',
          transform: 'rotate(-10deg)',
          zIndex: 2
        }}
      />

      {/* Image 2 card */}
      <img
        src={image2}
        alt="Our Love"
        style={{
          position: 'absolute',
          width: '288px',
          height: '302px',
          left: '442px',
          top: '1001px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          borderRadius: '8px',
          transform: 'rotate(10deg)',
          zIndex: 3
        }}
      />
    </div>
  );
}

export default Bio;
