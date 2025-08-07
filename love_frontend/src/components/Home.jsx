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
import CoupleSection from './CoupleSection';

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
          <HomeGuestbookSection />
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
