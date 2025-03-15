import React from 'react';
import { Link } from 'react-router-dom';
import image1 from '../../public/image1.png';
import image2 from '../../public/image2.png';
import About from './About';

function BioShort() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
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
          <h1 style={{ color: '#EAD7BB' }}>Thank you for your support</h1>
          <p style={{ color: '#EAD7BB' }}>
            We're thrilled to be celebrating our wedding with you. To make it extra meaningful, 
            we've decided that <strong>50% of every donation</strong> will help us as we start our new life 
            together, and the other <strong>50% will go directly to some of the charities</strong> we care about.
          </p>
          <p style={{ color: '#EAD7BB' }}>
            This way, your love and generosity not only supports our future, but also helps important causes 
            that we believe in.
          </p>
          <p className="text-center fst-italic mt-3">
            "For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, 
            plans to give you hope and a future." - Jeremiah 29:11
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
        <h2 style={{ textAlign: 'center', marginBottom: '1rem', marginTop: '3rem' }}>
          The Greatest Gift is Your Love and Presence
        </h2>
        <p>
          Our journey together over the past year has been incredible. God has been so good to us, 
          surprising us both by bringing us together when we least expected it. We are so filled with gratitude and 
          feel that our wedding is the perfect opportunity to express this by doing a little bit of good for others.
        </p>
        <div className="text-center mt-3">
          <Link to="/about" className="btn btn-primary mt-3">Learn More</Link>
        </div>
      </div>
    </div>
  );
}

export default BioShort;
