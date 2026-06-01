import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom';
import CampaignManage from '../src/components/CampaignManage';
import axiosInstance from '../src/api/axiosInstance';

vi.mock('../src/api/axiosInstance', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));

const campaign = {
  slug: 'gb-camp',
  title: 'GB',
  status: 'active',
  story: '',
  beneficiaries: [{ charity: { name: 'Charity One' } }],
};

const pendingMessage = {
  id: 9,
  display_name: 'Guest',
  body: 'Lovely day!',
  moderation_status: 'pending',
};

const renderManage = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard/campaigns/gb-camp']}>
      <Routes>
        <Route path="/dashboard/campaigns/:slug" element={<CampaignManage />} />
      </Routes>
    </MemoryRouter>
  );

describe('CampaignManage guestbook', () => {
  beforeEach(() => vi.clearAllMocks());

  test('loads pending messages from guestbook endpoint', async () => {
    axiosInstance.get
      .mockResolvedValueOnce({ data: campaign })
      .mockResolvedValueOnce({ data: [pendingMessage] });

    renderManage();

    await waitFor(() => expect(screen.getByText('Lovely day!')).toBeInTheDocument());
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(axiosInstance.get).toHaveBeenCalledWith('/campaigns/gb-camp/guestbook/');
  });

  test('approve calls moderate endpoint and reloads', async () => {
    axiosInstance.get
      .mockResolvedValueOnce({ data: campaign })
      .mockResolvedValueOnce({ data: [pendingMessage] })
      .mockResolvedValueOnce({ data: campaign })
      .mockResolvedValueOnce({
        data: [{ ...pendingMessage, moderation_status: 'approved' }],
      });
    axiosInstance.patch.mockResolvedValueOnce({ data: {} });

    renderManage();

    await waitFor(() => screen.getByRole('button', { name: /approve/i }));
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() =>
      expect(axiosInstance.patch).toHaveBeenCalledWith('/campaigns/gb-camp/moderate/', {
        message_id: 9,
        action: 'approve',
      })
    );
  });
});
