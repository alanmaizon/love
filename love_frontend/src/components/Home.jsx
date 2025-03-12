// src/components/Home.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

// Import existing components
import CountdownTimer from './CountdownTimer';
import ExploreCharities from './ExploreCharities';
import GuestMessages from './GuestMessages';

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
    // Fetch analytics (like AdminDashboard but for public view)
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

    // Fetch public profile for bride/groom details
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
    // Fallback to a known date if profile is unavailable
    return profile?.wedding_date || '2025-04-26T12:30:00';
  }, [profile]);

  // -------------------------------
  // 5) Render
  // -------------------------------
  return (
    <div className="home-page">
      {/* ================================
          HERO SECTION
      ================================ */}
      <section className="hero-image"></section>
      <section className="hero-section text-center" style={{ padding: '4rem 1rem' }}>
        <div className="container">
          <h1>Welcome to Our Wedding Celebration</h1>
          <p>We’re excited to share our special day with you!</p>
          <Link to="/donate" className="btn btn-primary mt-3">Send a Gift</Link>
        </div>
      </section>

      {/* ================================
          ABOUT US (with 50% donation note)
      ================================ */}
      <section className="about-us-section" style={{ padding: '4rem 1rem', backgroundColor: '#f8f8f8' }}>
        <div className="container">
          <h2>About Us</h2>
          <p>
            We’re thrilled to be celebrating our wedding with you. To make it extra meaningful, 
            we’ve decided that <strong>50% of every donation</strong> will help us as we start our new life 
            together, and the other <strong>50% will go directly to the charities</strong> we care about.
          </p>
          <p>
            This way, your love and generosity not only supports our future, but also helps important causes 
            that we believe in.
          </p>
        </div>
      </section>

      {/* ================================
          ANALYTICS SECTION
      ================================ */}
      <section className="analytics-section" style={{ padding: '4rem 1rem' }}>
        <div className="container">
          <h2>Donation Analytics</h2>
          {analyticsLoading ? (
            <p>Loading analytics...</p>
          ) : analyticsError ? (
            <p className="text-danger">{analyticsError}</p>
          ) : analytics ? (
            <>
              <p><strong>Total Donation Amount:</strong> €{analytics.total_amount}</p>
              <p><strong>Total Donations:</strong> {analytics.donations_count}</p>
              <ul>
                {analytics.count_per_charity && analytics.count_per_charity.map(item => (
                  <li key={item.charity__name}>
                    {item.charity__name}: {item.count} donations, Total: €{item.total_allocated}
                  </li>
                ))}
              </ul>
              {/* Combined analytics chart (as in AdminDashboard.jsx) */}
              <div style={{ marginTop: '2rem' }}>
                <h4>Combined Analytics Chart</h4>
                <img
                  src={`${axiosInstance.defaults.baseURL}/charts/`}
                  alt="Analytics Charts"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
            </>
          ) : null}
        </div>
      </section>

      {/* ================================
          WEDDING COUNTDOWN
      ================================ */}
      <section className="countdown-section text-center" style={{ padding: '4rem 1rem', backgroundColor: '#f0efe9' }}>
        <div className="container">
          <h2>Wedding Countdown</h2>
          <CountdownTimer targetDate={weddingDate} />
        </div>
      </section>

      {/* ================================
          CHARITIES
      ================================ */}
      <section className="charities-section" style={{ padding: '4rem 1rem' }}>
        <div className="container">
          <h2>Charities We Support</h2>
          <p>
            50% of your contribution will be donated to one of these charities.
            Thank you for helping us make the world a better place.
          </p>
          <ExploreCharities />
        </div>
      </section>

      {/* ================================
          ABOUT THE COUPLE (PUBLIC PROFILE)
      ================================ */}
      <section className="couple-section" style={{ padding: '4rem 1rem', backgroundColor: '#f8f8f8' }}>
        <div className="container">
          <h2>Meet the Couple</h2>
          {profileLoading ? (
            <p>Loading profile...</p>
          ) : profileError ? (
            <p className="text-danger">{profileError}</p>
          ) : profile ? (
            <>
              {profile.profile_picture_url && (
                <img
                  src={profile.profile_picture_url}
                  alt="Couple"
                  style={{ maxWidth: '150px', borderRadius: '50%', marginBottom: '1rem' }}
                />
              )}
              <p><strong>{profile.bride_name} &amp; {profile.groom_name}</strong></p>
              <p>{profile.bio || "We're looking forward to celebrating with you!"}</p>
              <p><strong>Location:</strong> {profile.location}</p>
            </>
          ) : (
            <p>No profile information available.</p>
          )}
        </div>
      </section>

      {/* ================================
          GUESTBOOK
      ================================ */}
      <section className="guestbook-section" style={{ padding: '4rem 1rem' }}>
        <div className="container">
          <h2>Guestbook</h2>
          <GuestMessages />
        </div>
      </section>
    </div>
  );
}

export default Home;
