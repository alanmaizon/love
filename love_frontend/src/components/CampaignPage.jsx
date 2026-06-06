import React, { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import CountdownTimer from './CountdownTimer';
import HomeGuestbookSection from './HomeGuestbookSection';
import { usePublicCampaign } from '../hooks/usePublicCampaign';

function CampaignPage() {
  const { slug } = useParams();
  const { campaign, loading, error } = usePublicCampaign(slug);

  const eventDate = useMemo(
    () => campaign?.event_date || '2025-04-26T13:00:00+01:00',
    [campaign],
  );

  if (loading) {
    return <div className="container mt-5 text-center">Loading campaign…</div>;
  }
  if (error || !campaign) {
    return (
      <div className="container mt-5 text-center">
        <h2>Campaign not found</h2>
        <p>{error || 'This registry may be private or no longer active.'}</p>
        <Link to="/campaigns" className="btn btn-primary">Browse campaigns</Link>
      </div>
    );
  }

  const donateTo = `/donate?campaign=${encodeURIComponent(campaign.slug)}`;

  return (
    <div className="home-page">
      <section className="hero-image" />
      <section className="hero-section text-center" style={{ padding: '4rem 1rem' }}>
        <div className="container">
          <h1>{campaign.title}</h1>
          {campaign.host_display_name && (
            <p className="lead">{campaign.host_display_name}</p>
          )}
          {campaign.story && (
            <p className="mx-auto" style={{ maxWidth: 720 }}>{campaign.story}</p>
          )}
          {campaign.location && <p className="text-muted">{campaign.location}</p>}
          <Link to={donateTo} className="btn btn-primary mt-3">Donate</Link>
        </div>
      </section>

      {campaign.event_date && (
        <section
          className="countdown-section text-center"
          style={{ padding: '4rem 1rem', backgroundColor: '#a47864' }}
        >
          <div className="container">
            <CountdownTimer targetDate={eventDate} videoId={campaign.livestream_video_id} />
            <p className="mt-3">
              {new Date(eventDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </section>
      )}

      <section className="guestbook-section text-center" style={{ padding: '4rem 1rem' }}>
        <div className="container">
          <h2>Guestbook Messages</h2>
          <HomeGuestbookSection campaignSlug={campaign.slug} />
        </div>
      </section>
    </div>
  );
}

export default CampaignPage;
