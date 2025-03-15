import React from 'react';
import { Link } from 'react-router-dom';
import image1 from '../../public/image1.png';
import image2 from '../../public/image2.png';
import About from './About';

function BioShort() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px 20px' }}>
      <div className="bio-top-section d-flex align-items-center gap-3">
        {/* Images */}
        <div className="bio-images position-relative">
          <img
            src={image1}
            alt="Our Journey"
            className="img-fluid rounded shadow"
            style={{ maxWidth: '400px', transform: 'rotate(-8deg)' }}
          />
          <img
            src={image2}
            alt="Our Love"
            className="img-fluid rounded shadow position-absolute"
            style={{ maxWidth: '300px', top: '120px', right: 0, transform: 'rotate(8deg)' }}
          />
        </div>

        {/* Text */}
        <div className="bio-text text-light">
          <h1>Thank you for your support</h1>
          <p>
            We’re so excited to celebrate our wedding with you! Instead of traditional gifts, we’re sharing this
            moment by supporting three charities close to our hearts while also starting our life together.
          </p>
        </div>
      </div>

      {/* Additional Text */}
      <div className="bg-dark rounded p-4 text-light mt-3">
        <h2 className="text-center mb-3">The Greatest Gift is Your Love</h2>
        <p>
          Your love and presence are the greatest gifts. But if you'd like to contribute in another way, we
          welcome support for our chosen charities and our new life together.
        </p>
        <p className="text-center fst-italic mt-3">
          "For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, 
          plans to give you hope and a future." - Jeremiah 29:11
        </p>
        <div className="text-center mt-3">
          <Link to="/about" className="btn btn-primary mt-3">Learn More</Link>
        </div>
      </div>
    </div>
  );
}

export default BioShort;
