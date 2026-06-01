import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function GetStarted() {
  return (
    <div className="onboarding-page">
      <h1 className="text-center">How will you use Love That Gives Back?</h1>
      <p className="text-center text-muted mb-4">
        Choose the path that fits you. You can always add the other later from your dashboard.
      </p>
      <div className="landing-cards">
        <article className="landing-card">
          <h3>I&apos;m hosting a celebration</h3>
          <p>Wedding, birthday, memorial, or any occasion where guests give to charity.</p>
          <Link to="/onboarding/couple" className="btn btn-primary">Couple / host onboarding</Link>
        </article>
        <article className="landing-card">
          <h3>I represent a charity</h3>
          <p>Register your organisation to receive donations via Stripe Connect.</p>
          <Link to="/onboarding/charity" className="btn btn-primary">Charity onboarding</Link>
        </article>
      </div>
      <p className="text-center mt-4">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}

export default GetStarted;
