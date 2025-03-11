import React from 'react';
// Replace these imports with your actual image paths
import image1 from '../assets/image1.jpg';
import image2 from '../assets/image2.jpg';

function Bio() {
  return (
    <div style={{ position: 'relative', width: '1500px', height: '2200px', margin: '0 auto' }}>
      {/* About Us section as the background card */}
      <section
        style={{
          position: 'absolute',
          width: '1093px',
          height: '678px',
          left: '312px',
          top: '951px',
          backgroundColor: '#fff',
          padding: '20px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          borderRadius: '8px'
        }}
      >
        <h1>About Us</h1>
        <p>
          Welcome to our story. Here you'll learn about our journey, our love, and our dreams. We hope our story inspires you as much as your support inspires us.
        </p>
      </section>

      {/* Image 1 card */}
      <img
        src={image1}
        alt="Our Journey"
        style={{
          position: 'absolute',
          width: '480px',
          height: '490px',
          left: '312px',
          top: '951px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          borderRadius: '8px',
          transform: 'rotate(-10deg)'
        }}
      />

      {/* Image 2 card */}
      <img
        src={image2}
        alt="Our Love"
        style={{
          position: 'absolute',
          width: '360px',
          height: '378px',
          left: '552px',
          top: '1251px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          borderRadius: '8px',
          transform: 'rotate(10deg)'
        }}
      />
    </div>
  );
}

export default Bio;
