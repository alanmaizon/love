import { useEffect, useState } from 'react';
import axiosInstance from '../api/axiosInstance';

/** Map API campaign to legacy wedding-display shape (BioShort / CountdownTimer). */
export function campaignToProfile(campaign) {
  if (!campaign) return null;
  const host = campaign.host_display_name || campaign.title || '';
  const [brideName = host, groomName = ''] = host.split(' & ');
  return {
    bride_name: brideName,
    groom_name: groomName,
    bio: campaign.story || '',
    location: campaign.location || '',
    wedding_date: campaign.event_date || null,
    profile_picture_url: campaign.cover_image_url || '',
  };
}

/**
 * Load a public campaign by slug, or the flagship when slug is omitted.
 */
export function usePublicCampaign(slug) {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const url = slug ? `/campaign/${slug}/` : '/campaign/';
    axiosInstance.get(url)
      .then((res) => setCampaign(res.data))
      .catch(() => {
        setCampaign(null);
        setError(slug ? 'Campaign not found.' : 'Failed to load campaign.');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  return { campaign, profile: campaignToProfile(campaign), loading, error };
}
