// src/components/Home.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import poppy from '../../public/poppy.svg';
import rose from '../../public/rose.svg';
import { FaPhoneAlt, FaEnvelope, FaWhatsapp } from 'react-icons/fa';

// Import existing components
import StatsSection from './StatsSection';
import CountdownTimer from './CountdownTimer';
import ExploreCharities from './ExploreCharities';
import HomeGuestbookSection from './HomeGuestbookSection';
import BioShort from './BioShort';
import HandsGif from './HandsGif';

function Home() {
  // -------------------------------
  // 1) State for Analytics
  // -------------------------------
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');

  // -------------------------------
  // 2) State for Public Profile
  // -------------------------------
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  // -------------------------------
  // 3) Fetch Data on Mount
  // -------------------------------
  useEffect(() => {
    axiosInstance.get('/analytics/')
      .then((res) => {
        setAnalytics(res.data);
      })
      .catch(() => {
        setAnalyticsError('Failed to load analytics data.');
      })
      .finally(() => {
        setAnalyticsLoading(false);
      });

    axiosInstance.get('/public_profile/')
      .then((res) => {
        setProfile(res.data);
      })
      .catch(() => {
        setProfileError('Failed to load public profile data.');
      })
      .finally(() => {
        setProfileLoading(false);
      });
  }, []);

  // -------------------------------
  // 4) Wedding Date (Memo)
  // -------------------------------
  const weddingDate = useMemo(() => {
    return profile?.wedding_date || '2025-04-26T13:00:00+01:00';
  }, [profile]);

  // -------------------------------
  // 5) Render
  // -------------------------------
  return (
    <div className="home-page">
      {/* HERO SECTION */}
      <section className="hero-image"></section>
      <section className="hero-section text-center" style={{ padding: '4rem 1rem' }}>
        <div className="container">
          <h1>Welcome to Our Wedding Celebration</h1>
          <p>We're excited to share our special day with you!</p>
          <Link to="/donate" className="btn btn-primary mt-3">Send a Gift & Leave a Message</Link>
        </div>
      </section>

      {/* ABOUT US */}
      <section className="about-us-section" style={{ padding: '4rem 1rem', backgroundColor: '#a47864' }}>
        <div className="container">
          <BioShort />
        </div>
      </section>

      {/* CHARITIES */}
      <section className="charities-section" style={{ padding: '4rem 1rem' }}>
        <div className="container">
          <h2>Charities We Support</h2>
          <p>50% of your contribution will be donated to one of these charities. Thank you for helping us make the world a better place.</p>
          <ExploreCharities />
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
          <h2 style={{ marginTop: '2rem' }}>Wedding live stream</h2>
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
          <HomeGuestbookSection />
        </div>
      </section>

      {/* ABOUT THE COUPLE */}
      <section className="couple-section text-center" style={{ backgroundColor: '#a47864', position: 'relative', padding: '4rem 1rem', overflow: 'hidden' }}>
        <div className="container" style={{ position: 'relative'}}>
          <h2>Meet the Couple</h2>
          {profileLoading ? (
            <p>All you need is love...</p>
          ) : profileError ? (
            <p className="text-danger">{profileError}</p>
          ) : profile ? (
            <>
              {profile.profile_picture_url && (
                <img src={profile.profile_picture_url} alt="Couple" style={{ maxWidth: '150px', borderRadius: '50%', marginBottom: '1rem' }} />
              )}
              <p><strong>{profile.bride_name} &amp; {profile.groom_name}</strong></p>
              <p>{profile.bio || "We're looking forward to celebrating with you!"}</p>
              <p>You can find us in <strong>{profile.location}</strong>. Feel free to contact us, send us a private message.</p>

              {/* Updated Social Media Icons */}
              <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <a href="tel:353896179069" target="_blank" rel="noopener noreferrer">
                  <FaPhoneAlt style={{ fontSize: '2rem', margin: '1rem', color: '#EAD7BB' }} />
                </a>
                <a href="mailto:maizonalan@gmail.com">
                  <FaEnvelope style={{ fontSize: '2rem', margin: '1rem', color: '#EAD7BB' }} />
                </a>
                <a href="https://wa.me/353870956520" target="_blank" rel="noopener noreferrer">
                  <FaWhatsapp style={{ fontSize: '2rem', margin: '1rem', color: '#EAD7BB' }} />
                </a>
              </div>
            </>
          ) : (
            <p>No profile information available.</p>
          )}
        </div>

        {/* HandsGif Background */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1, opacity: 0.3, pointerEvents: 'none' }}>
          <HandsGif />
        </div>
      </section>

      {/* ANALYTICS SECTION */}
      <StatsSection analytics={analytics} donationGoal={2200} analyticsLoading={analyticsLoading} analyticsError={analyticsError} />
    </div>
  );
}

export default Home;