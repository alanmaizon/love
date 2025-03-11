import React, { useState, useEffect, useMemo } from 'react';
import axiosInstance from '../api/axiosInstance';
import CountdownTimer from './CountdownTimer';
import { Link } from 'react-router-dom';

function Home() {
  const [analytics, setAnalytics] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [analyticsError, setAnalyticsError] = useState('');

  useEffect(() => {
    // Fetch profile and analytics in parallel
    axiosInstance.get('/public_profile/')
      .then((res) => setProfile(res.data))
      .catch(() => setProfileError('Failed to load profile.'))
      .finally(() => setLoadingProfile(false));

    axiosInstance.get('/analytics/', { withCredentials: true })
      .then((res) => setAnalytics(res.data))
      .catch(() => setAnalyticsError('Failed to load charity statistics.'))
      .finally(() => setLoadingAnalytics(false));
  }, []);

  // Memoize wedding date to prevent unnecessary recalculations
  const weddingDate = useMemo(() => profile?.wedding_date || "2025-04-26T12:30:00", [profile]);

  // Define donation goal and calculate progress percentage if analytics is loaded.
  const donationGoal = 1200;
  const currentTotal = analytics ? analytics.total_amount : 0;
  const progressPercentage = Math.min((currentTotal / donationGoal) * 100, 100);

  return (
    <div className="container mt-5">
      {/* Hero Section */}
      <section className="hero-image"></section>
      <section className="hero-section text-center">
        <p className="lead">
          Contribute to our wedding gift fund supporting meaningful causes we love.
        </p>
        <div className="hero-buttons mt-3">
          <Link to="/donate" className="btn btn-primary me-2">Gift Contribution</Link>
          <Link to="/charities" className="btn btn-secondary">Explore Charities</Link>
        </div>
      </section>

      {/* About the Couple Section */}
      {loadingProfile ? (
        <div className="text-center mt-4">
          <div className="spinner-border text-light" role="status"></div>
          <p>Loading profile...</p>
        </div>
      ) : profileError ? (
        <div className="alert alert-warning text-center mt-4">{profileError}</div>
      ) : profile && (
        <section className="about-section mt-5 text-center">
          <h2>About the Couple</h2>
          <img 
            src={profile.profile_picture_url} 
            alt="Profile" 
            className="img-fluid rounded-circle mb-3" 
            style={{ maxWidth: '150px' }} 
          />
          <p className="fw-bold">{profile.bride_name} &amp; {profile.groom_name}</p>
          <p>{profile.bio || "No bio available."}</p>
          <p><strong>Location:</strong> {profile.location}</p>
        </section>
      )}

      {/* Countdown Timer Section */}
      <section className="countdown-section mt-5 text-center">
        <h2>Countdown to Our Wedding</h2>
        <CountdownTimer targetDate={weddingDate} />
      </section>

      {/* Live Charity Stats Section */}
      {loadingAnalytics ? (
        <div className="text-center mt-4">
          <div className="spinner-border text-light" role="status"></div>
          <p>Loading statistics...</p>
        </div>
      ) : analyticsError ? (
        <div className="alert alert-danger text-center mt-4">{analyticsError}</div>
      ) : (
        <section className="stats-section mt-5 text-center">
          <h2>Live Contribution</h2>
          <p><strong>Total Contributions:</strong> €{currentTotal.toLocaleString()}</p>
          <p><strong>Participation Count:</strong> {analytics.donations_count.toLocaleString()}</p>
          
          {/* Donation Goal Progress Bar */}
          <div className="mt-4">
            <h4>Donation Goal: €{donationGoal.toLocaleString()}</h4>
            <div 
              className="d-flex align-items-center" 
              style={{ width: '30vw', margin: '0 auto' }}
            >
              {/* Left side: progress calculation */}
              <div 
                style={{ marginRight: '10px', minWidth: '50px', textAlign: 'right' }}
              >
                {progressPercentage.toFixed(0)}%
              </div>
              {/* Right side: progress bar */}
              <div className="progress" style={{ flex: 1, height: '25px' }}>
                <div
                  className="progress-bar"
                  role="progressbar"
                  style={{ width: `${progressPercentage}%`, backgroundColor: '#FFFDD0' }}
                  aria-valuenow={progressPercentage}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default Home;
