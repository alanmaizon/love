// src/components/StatsSection.jsx
import React from 'react';
import axiosInstance from '../api/axiosInstance';

function StatsSection({ analytics, donationGoal = 1200, analyticsLoading, analyticsError }) {
  // Calculate current donation total and progress percentage.
  const currentTotal = analytics ? analytics.total_amount : 0;
  const progressPercentage = Math.min((currentTotal / donationGoal) * 100, 100);

  return (
    <section className="analytics-section text-center" style={{ padding: '4rem 1rem' }}>
      <div className="container">
        <h2>Donation Analytics</h2>
        {analyticsLoading ? (
          <p>Loading analytics...</p>
        ) : analyticsError ? (
          <p className="text-danger">{analyticsError}</p>
        ) : analytics ? (
          <>
            <p>
              <strong>Total Donation Amount:</strong> €{analytics.total_amount.toLocaleString()}
            </p>
            <p>
              <strong>Total Donations:</strong> {analytics.donations_count.toLocaleString()}
            </p>
            <ul>
              {analytics.count_per_charity &&
                analytics.count_per_charity.map((item) => (
                  <li key={item.charity__name}>
                    {item.charity__name}: {item.count} donations, Total: €{item.total_allocated.toLocaleString()}
                  </li>
                ))}
            </ul>

            {/* Progress Bar Section */}
            <div className="mt-4">
              <h4>Our Goal: €{donationGoal.toLocaleString()}</h4>
              <div style={{ position: 'relative', width: '30vw', margin: '0 auto' }}>
                <span
                  style={{
                    position: 'absolute',
                    right: '100%',
                    marginRight: '5px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    minWidth: '40px',
                    textAlign: 'right',
                  }}
                >
                  {progressPercentage.toFixed(0)}%
                </span>
                <div className="progress" style={{ height: '25px' }}>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: `${progressPercentage}%`, backgroundColor: '#56443F' }}
                    aria-valuenow={progressPercentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  ></div>
                </div>
              </div>
            </div>

            {/* Combined Analytics Chart */}
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
  );
}

export default StatsSection;
