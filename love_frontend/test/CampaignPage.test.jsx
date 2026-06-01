import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom';
import CampaignPage from '../src/components/CampaignPage';

const mockCampaign = {
  slug: 'flow-camp',
  title: 'Flow Camp',
  host_display_name: 'Sam & Alex',
  story: 'Our story',
  location: 'Dublin',
  event_date: '2026-06-01T12:00:00Z',
};

vi.mock('../src/hooks/usePublicCampaign', () => ({
  usePublicCampaign: vi.fn(),
}));

vi.mock('../src/components/CountdownTimer', () => ({
  default: () => <div data-testid="countdown" />,
}));

vi.mock('../src/components/HomeGuestbookSection', () => ({
  default: ({ campaignSlug }) => (
    <div data-testid="guestbook">guestbook:{campaignSlug}</div>
  ),
}));

import { usePublicCampaign } from '../src/hooks/usePublicCampaign';

describe('CampaignPage', () => {
  beforeEach(() => vi.clearAllMocks());

  test('renders guestbook with campaign slug when loaded', () => {
    usePublicCampaign.mockReturnValue({
      campaign: mockCampaign,
      loading: false,
      error: '',
    });

    render(
      <MemoryRouter initialEntries={['/c/flow-camp']}>
        <Routes>
          <Route path="/c/:slug" element={<CampaignPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Flow Camp')).toBeInTheDocument();
    expect(screen.getByTestId('guestbook')).toHaveTextContent('guestbook:flow-camp');
    expect(screen.getByRole('link', { name: /donate/i })).toHaveAttribute(
      'href',
      '/donate?campaign=flow-camp'
    );
  });

  test('shows not found when hook returns error', () => {
    usePublicCampaign.mockReturnValue({
      campaign: null,
      loading: false,
      error: 'Campaign not found.',
    });

    render(
      <MemoryRouter initialEntries={['/c/missing']}>
        <Routes>
          <Route path="/c/:slug" element={<CampaignPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /campaign not found/i })).toBeInTheDocument();
  });
});
