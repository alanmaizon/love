// src/components/Home.jsx
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import poppy from '../../public/poppy.svg';
import rose from '../../public/rose.svg';

import CountdownTimer from './CountdownTimer';
import HomeGuestbookSection from './HomeGuestbookSection';
import BioShort from './BioShort';
import CoupleSection from './CoupleSection';
import { usePublicCampaign } from '../hooks/usePublicCampaign';

function Home() {
  const { campaign, profile, loading: profileLoading, error: profileError } = usePublicCampaign();

  const weddingDate = useMemo(() => {
    return profile?.wedding_date || '2025-04-26T13:00:00+01:00';
  }, [profile]);

  const donateTo = campaign?.slug
    ? `/donate?campaign=${encodeURIComponent(campaign.slug)}`
    : '/donate';

  // -------------------------------
  // 4) Render
  // -------------------------------
  return (
    <div className="home-page">
      {/* HERO SECTION */}
      <section className="hero-image"></section>
      <section className="hero-section text-center" style={{ padding: '4rem 1rem' }}>
        <div className="container">
          <h1>Welcome to Our Wedding Celebration</h1>
          <p>We're excited to share our special day with you!</p>
          <Link to={donateTo} className="btn btn-primary mt-3">Donate</Link>
          {campaign?.slug && (
            <p className="mt-2">
              <Link to={`/c/${campaign.slug}`}>Shareable campaign link</Link>
              {' · '}
              <Link to="/campaigns">More registries</Link>
            </p>
          )}
        </div>
      </section>

      {/* ABOUT US */}
      <section className="about-us-section" style={{ padding: '4rem 1rem', backgroundColor: '#a47864' }}>
        <div className="container">
          <BioShort />
        </div>
      </section>
      
      {/* WEDDING LIVESTREAM */}
      <section className="countdown-section text-center" style={{ padding: '4rem 1rem', backgroundColor: '#a47864', position: 'relative' }}>
        <img src={poppy} alt="Wildflower Poppy" style={{ position: 'absolute', left: '20px', bottom: '0', height: '35%', zIndex: 0, opacity: 0.3 }} />
        <img src={rose} alt="Wildflower Rose" style={{ position: 'absolute', right: '20px', bottom: '0', height: '35%', zIndex: 0, opacity: 0.3 }} />
        <div className="container" style={{ fontSize: '1.5rem', position: 'relative' }}>

          <div style={{ maxWidth: '100%', overflow: 'hidden' }}>
        <CountdownTimer targetDate={weddingDate} />
          </div>
          <h2 style={{ marginTop: '2rem' }}>St. Mary's Church - Enniskerry</h2>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', marginTop: '2rem' }}>
        {new Date(weddingDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
          </p>
        </div>
      </section>

        {/* GUESTBOOK */}
      <section className="guestbook-section text-center" style={{ padding: '4rem 1rem' }}>
        <div className="container">
          <h2>Guestbook Messages</h2>
          <HomeGuestbookSection campaignSlug={campaign?.slug} />
        </div>
      </section>

      {/* COUPLE SECTION */}
      <section className="guestbook-section text-center" style={{ padding: '4rem 1rem' }}>
        <div className="container">
          <CoupleSection />
        </div>
      </section>
    </div>
  );
}

export default Home;
