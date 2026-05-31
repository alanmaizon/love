// src/components/StatsSection.jsx
import React from 'react';

function StatsSection({ analytics, donationGoal = 4000, analyticsLoading, analyticsError }) {
  const currentTotal = Number(analytics?.total_amount ?? 0);
  const progressPercentage = Math.min((currentTotal / donationGoal) * 100, 100);

  const perCharity = analytics?.count_per_charity ?? [];
  const maxAllocated = perCharity.reduce(
    (m, c) => Math.max(m, Number(c.total_allocated ?? 0)),
    0,
  );

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
              <strong>Total Raised for Charity:</strong> €{currentTotal.toLocaleString()}
            </p>
            <p>
              <strong>Total Donations:</strong>{' '}
              {Number(analytics.donations_count ?? 0).toLocaleString()}
            </p>

            {/* Per-charity breakdown as CSS bars (100% to charity). */}
            <div className="mx-auto" style={{ maxWidth: 520, textAlign: 'left' }}>
              {perCharity.map((item) => {
                const total = Number(item.total_allocated ?? 0);
                const width = maxAllocated ? (total / maxAllocated) * 100 : 0;
                return (
                  <div key={item.charity__name} className="mb-3">
                    <div className="d-flex justify-content-between">
                      <strong>{item.charity__name}</strong>
                      <span>€{total.toLocaleString()} · {item.count} gifts</span>
                    </div>
                    <div className="progress" style={{ height: 14 }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{ width: `${width}%`, backgroundColor: '#A47864' }}
                        aria-valuenow={width}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Goal progress */}
            <div className="mt-4">
              <h4>Our Goal: €{donationGoal.toLocaleString()}</h4>
              <div style={{ position: 'relative', maxWidth: 520, margin: '0 auto' }}>
                <div className="progress" style={{ height: '25px' }}>
                  <div
                    className="progress-bar"
                    role="progressbar"
                    style={{ width: `${progressPercentage}%`, backgroundColor: '#BBAA91' }}
                    aria-valuenow={progressPercentage}
                    aria-valuemin="0"
                    aria-valuemax="100"
                  >
                    {progressPercentage.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

export default StatsSection;
