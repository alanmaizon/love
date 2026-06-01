import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import './Home.css';

function Home() {
  const [campaigns, setCampaigns] = useState([]);
  const [flagshipSlug, setFlagshipSlug] = useState('');

  useEffect(() => {
    axiosInstance.get('/campaigns/')
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setCampaigns(list.slice(0, 6));
      })
      .catch(() => setCampaigns([]));

    axiosInstance.get('/campaign/')
      .then((res) => setFlagshipSlug(res.data?.slug || ''))
      .catch(() => setFlagshipSlug(''));
  }, []);

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="container">
          <h1>Love That Gives Back</h1>
          <p className="lead">
            Turn weddings, birthdays, and celebrations into verified charitable gifts.
            Guests donate through Stripe; every euro goes to a real charity you choose.
          </p>
          <div className="landing-cta">
            <Link to="/get-started" className="btn btn-primary btn-lg">Get started</Link>
            <Link to="/campaigns" className="btn btn-outline-light btn-lg">Browse registries</Link>
            {flagshipSlug && (
              <Link to={`/c/${flagshipSlug}`} className="btn btn-outline-light btn-lg">
                See our story
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="landing-section">
        <div className="container">
          <h2>Two ways to join</h2>
          <div className="landing-cards">
            <article className="landing-card">
              <h3>Hosts & couples</h3>
              <p>Create a celebration registry, pick a verified charity, and share your page with guests.</p>
              <ul className="landing-steps">
                <li>Create an account</li>
                <li>Describe your celebration</li>
                <li>Choose a charity & publish</li>
                <li>Guests donate & leave messages</li>
              </ul>
              <Link to="/onboarding/couple" className="btn btn-primary">Start a registry</Link>
            </article>
            <article className="landing-card">
              <h3>Charities</h3>
              <p>Register your organisation, connect Stripe payouts, and receive gifts from celebration hosts.</p>
              <ul className="landing-steps">
                <li>Create an account</li>
                <li>Submit charity details</li>
                <li>Complete Stripe Connect</li>
                <li>Get verified by our team</li>
              </ul>
              <Link to="/onboarding/charity" className="btn btn-primary">Register a charity</Link>
            </article>
          </div>
        </div>
      </section>

      {campaigns.length > 0 && (
        <section className="landing-section alt">
          <div className="container landing-campaigns">
            <h2>Active registries</h2>
            {campaigns.map((c) => (
              <div key={c.id} className="landing-campaign-row">
                <div>
                  <strong>{c.title}</strong>
                  {c.host_display_name && (
                    <span className="text-muted ms-2">— {c.host_display_name}</span>
                  )}
                </div>
                <Link to={`/c/${c.slug}`} className="btn btn-sm btn-outline-light">View</Link>
              </div>
            ))}
            <p className="text-center mt-3">
              <Link to="/campaigns">View all</Link>
            </p>
          </div>
        </section>
      )}

      <section className="landing-flagship">
        <p className="mb-0">
          Trusted payments via Stripe Connect · Transparent ledger · 100% to verified charities
        </p>
      </section>
    </div>
  );
}

export default Home;
