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
          <h1 style={{ color: '#EAD7BB' }}>Thank you for your support</h1>
          <p style={{ color: '#EAD7BB' }}>
            We're thrilled to be celebrating our wedding with you. To make it extra meaningful, 
            we've decided that <strong>50% of every donation</strong> will help us as we start our new life 
            together, and the other <strong>50% will go directly to some of the charities</strong> we care about.
          </p>
          <p style={{ color: '#EAD7BB' }}>
            This way, your love and generosity not only supports our future, but also helps important causes 
            that we believe in. We hope to use the 50% of your donation that’s going to us towards a trip to Argentina to visit Alan’s family, who Anna hasn’t met yet. 
            This would be a dream come true for us!
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
        <p>
          Your love, support, presence and prayers on our wedding day, whether in person or virtually, 
          are the greatest gifts you could give to us. However, if you wish to contribute in another way, 
          we would greatly appreciate a little something to start us off as we set up our life together, 
          and at the same time, allowing us to share our love more broadly and in a more concrete and practical way, 
          through the three charitable organisations that we have chosen. Hence, this website, instead of traditional gifts! 
        </p>
        <p>
          There are countless organisations doing great work, so we have chosen just three that inspire us 
          and are close to our hearts. 
          The first is 'Mary's Meals'. Anna had a wonderful experience visiting the beautiful place in the Scottish 
          Highlands where it all began. She is also currently reading and enjoying the founder's book "The Shed That Fed Two Million Children",
          which she'd recommend to anyone who needs to reignite their faith in humanity, and also in God.
        </p>
        <p>
          Secondly we chose 'Operation Smile', who provides life-changing surgeries to babies and children born with cleft palates, 
          especially in developing countries. Alan's brother was born with a cleft palate and surgery made all the difference in his life. 
          So, it felt like a worthwhile cause to support and an especially personal one.
        </p>
        <p>
          The final one needs a small story to explain it. Anna's brother Ben gifted Alan with the perfect wedding ring (for him!), 
          and we of course wanted to pay him something for it. As he wouldn't accept anything, we asked him if there was anything we could do,
          and he suggested that we might like to make a donation to 'Xingu Vivo', a grassroots movement based in the Amazon region of Brazil. 
          Ben lives in Brazil and works as a conservation biologist with critically endangered bird species, and is more aware than most of the 
          impact that industry and development has on the environment and the natural world, including the indigenous people of the Amazon Basin. 
          This organisation challenges human and environmental rights violations and works with populations threatened by the Belo Monte dam project.
        </p>
        <p>
          Thank you for being part of our journey and for supporting us financially, spiritually or otherwise, and for giving us this unique 
          opportunity to do something meaningful and beautiful as we celebrate one of the most significant moments in our own lives. Be blessed!
        </p>
        <p style={{ textAlign: 'right', fontStyle: 'italic' }}>
          With love,<br />Alan &amp; Anna
        </p>
      </div>
    </div>
  );
}

export default Bio;
