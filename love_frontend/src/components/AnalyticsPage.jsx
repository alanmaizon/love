import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import StatsSection from './StatsSection';

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsError, setAnalyticsError] = useState('');

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
  }, []);

  return (
    <div className="container mt-5 mb-5 pb-5">
      <StatsSection 
        analytics={analytics} 
        analyticsLoading={analyticsLoading} 
        analyticsError={analyticsError} 
        donationGoal={1200}
      />
    </div>
  );
}

export default AnalyticsPage;
