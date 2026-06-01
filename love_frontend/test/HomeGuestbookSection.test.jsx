import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomeGuestbookSection from '../src/components/HomeGuestbookSection';
import axiosInstance from '../src/api/axiosInstance';

vi.mock('../src/api/axiosInstance', () => ({
  default: { get: vi.fn() },
}));

vi.mock('../src/components/GuestMessagesCarousel', () => ({
  default: ({ messages }) => (
    <div data-testid="carousel">
      {messages.map((m) => (
        <span key={m.message}>{m.donor_name}: {m.message}</span>
      ))}
    </div>
  ),
}));

describe('HomeGuestbookSection', () => {
  beforeEach(() => vi.clearAllMocks());

  test('fetches approved messages for campaign slug', async () => {
    axiosInstance.get.mockResolvedValueOnce({
      data: [
        { display_name: 'Anna', body: 'Congrats!', moderation_status: 'approved' },
        { display_name: 'Bob', body: '   ', moderation_status: 'approved' },
      ],
    });

    render(<HomeGuestbookSection campaignSlug="anna-and-alan" />);

    await waitFor(() =>
      expect(axiosInstance.get).toHaveBeenCalledWith('/messages/?campaign=anna-and-alan')
    );
    expect(screen.getByText('Anna: Congrats!')).toBeInTheDocument();
    expect(screen.queryByText(/Bob:/)).not.toBeInTheDocument();
  });

  test('does not fetch when slug missing', () => {
    render(<HomeGuestbookSection campaignSlug="" />);
    expect(axiosInstance.get).not.toHaveBeenCalled();
  });
});
