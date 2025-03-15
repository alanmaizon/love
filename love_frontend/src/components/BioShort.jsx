import React from 'react';
import { useNavigate } from 'react-router-dom';
import image1 from '../../public/image1.png';
import image2 from '../../public/image2.png';
import { Button } from '@/components/ui/button';

function BioShort() {
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
      <div className="bio-top-section" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Images */}
        <div className="bio-images" style={{ position: 'relative' }}>
          <img
            src={image1}
            alt="Our Journey"
            style={{
              width: '100%',
              maxWidth: '400px',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
              transform: 'rotate(-8deg)'
            }}
          />
          <img
            src={image2}
            alt="Our Love"
            style={{
              width: '70%',
              maxWidth: '300px',
              position: 'absolute',
              top: '120px',
              right: 0,
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
              transform: 'rotate(8deg)'
            }}
          />
        </div>

        {/* Text */}
        <div className="bio-text" style={{ color: '#EAD7BB' }}>
          <h1 style={{ color: '#EAD7BB' }}>Thank you for your support</h1>
          <p>
            We’re so excited to celebrate our wedding with you! Instead of traditional gifts, we’re sharing this
            moment by supporting three charities close to our hearts while also starting our life together.
          </p>
        </div>
      </div>

      {/* Additional Text */}
      <div
        style={{
          backgroundColor: '#3D2C1E',
          borderRadius: '8px',
          padding: '1.5rem',
          color: '#EAD7BB',
          lineHeight: '1.6',
          marginTop: '2rem'
        }}
      >
        <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>The Greatest Gift is Your Love</h2>
        <p>
          Your love and presence are the greatest gifts. But if you'd like to contribute in another way, we
          welcome support for our chosen charities and our new life together.
        </p>
        <p style={{ textAlign: 'center', fontStyle: 'italic', marginTop: '1rem' }}>
          "For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, 
          plans to give you hope and a future." - Jeremiah 29:11
        </p>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Button onClick={() => navigate('/about-us')} variant="outline">
            Learn More
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BioShort;
