import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DonationConfirmation from '../src/components/DonationConfirmation';
import axiosInstance from '../src/api/axiosInstance';

vi.mock('../src/api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

describe('DonationConfirmation Component', () => {
  beforeEach(() => vi.clearAllMocks());
  it('renders a thank-you and the amount when donation state is provided', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/confirmation', state: { donation: { amount: 100 } } }]}>
        <DonationConfirmation />
      </MemoryRouter>
    );
    expect(screen.getByText(/thank you/i)).toBeInTheDocument();
    expect(screen.getByText(/€100/)).toBeInTheDocument();
  });

  it('renders a generic thank-you when no donation state is provided', () => {
    render(
      <MemoryRouter>
        <DonationConfirmation />
      </MemoryRouter>
    );
    expect(screen.getByText(/thank you/i)).toBeInTheDocument();
    expect(screen.getByText(/100% to the charity/i)).toBeInTheDocument();
  });

  it('calls sync-checkout when session_id is in the URL', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: {} });
    axiosInstance.post.mockResolvedValueOnce({ data: { status: 'confirmed' } });

    render(
      <MemoryRouter initialEntries={['/confirmation?session_id=cs_test_abc']}>
        <DonationConfirmation />
      </MemoryRouter>
    );

    await waitFor(() =>
      expect(axiosInstance.post).toHaveBeenCalledWith('/payments/sync-checkout/', {
        session_id: 'cs_test_abc',
      })
    );
    expect(screen.getByText(/thank you/i)).toBeInTheDocument();
  });
});
