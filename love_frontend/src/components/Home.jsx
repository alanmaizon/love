// src/components/Home.jsx
import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import CountdownTimer from './CountdownTimer';
import { Link } from 'react-router-dom';

function Home() {
  const [analytics, setAnalytics] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, profileRes] = await Promise.all([
          axiosInstance.get('/analytics/', { withCredentials: true }),
          axiosInstance.get('/public_profile/')
        ]);
        setAnalytics(analyticsRes.data);
        setProfile(profileRes.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch data.');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Use the wedding_date from profile; if not available, use a fallback.
  const weddingDate = profile ? profile.wedding_date : "2025-04-25T12:30:00";

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mt-5">
      {/* Hero Section */}
      <section className="hero-section text-center">
        <h1>Love That Gives Back</h1>
        <p>
          Celebrating love by inspiring generosity. Join us in supporting charities that reflect our values.
        </p>
        <div className="hero-buttons mt-3">
          <Link to="/login" className="btn btn-secondary">Login</Link>
          <Link to="/donate" className="btn btn-primary me-2">Donate Now</Link>
          <Link to="/charities" className="btn btn-secondary">Explore Charities</Link>
        </div>
      </section>

      {/* About the Couple Section */}
      {profile && (
        <section className="about-section mt-5 text-center">
          <h2>About the Couple</h2>
          <p>
            <strong>{profile.bride_name} &amp; {profile.groom_name}</strong>
          </p>
          <p>{profile.bio || "No bio available."}</p>
          <p>
            <strong>Location:</strong> {profile.location}
          </p>
        </section>
      )}

      {/* Countdown Timer Section */}
      <section className="countdown-section mt-5 text-center">
        <h2>Countdown to Our Wedding</h2>
        <CountdownTimer targetDate={weddingDate} />
      </section>

      {/* Live Charity Stats Section */}
      <section className="stats-section mt-5 text-center">
        <h2>Live Charity Stats</h2>
        {error ? (
          <p>{error}</p>
        ) : analytics ? (
          <div>
            <p><strong>Total Donations:</strong> ${analytics.total_amount}</p>
            <p><strong>Donations Count:</strong> {analytics.donations_count}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export default Home;
