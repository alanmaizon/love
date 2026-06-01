import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import GuestMessages from '../src/components/GuestMessages';
import { AuthContext } from '../src/context/AuthContext';
import axiosInstance from '../src/api/axiosInstance';

vi.mock('../src/api/axiosInstance', () => ({
  default: { get: vi.fn() },
}));

vi.mock('../src/components/GuestMessagesCarousel', () => ({
  default: ({ messages }) => (
    <ul>
      {messages.map((m) => (
        <li key={m.message}>{m.donor_name}</li>
      ))}
    </ul>
  ),
}));

describe('GuestMessages page', () => {
  beforeEach(() => vi.clearAllMocks());

  test('uses campaign query param when present', async () => {
    axiosInstance.get.mockResolvedValueOnce({
      data: [{ display_name: 'Guest', body: 'Hello' }],
    });

    render(
      <AuthContext.Provider value={{ campaign: { slug: 'flagship' } }}>
        <MemoryRouter initialEntries={['/messages?campaign=other-camp']}>
          <GuestMessages />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() =>
      expect(axiosInstance.get).toHaveBeenCalledWith('/messages/?campaign=other-camp')
    );
    expect(screen.getByText('Guest')).toBeInTheDocument();
  });

  test('falls back to flagship slug from context', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: [] });

    render(
      <AuthContext.Provider value={{ campaign: { slug: 'anna-and-alan' } }}>
        <MemoryRouter initialEntries={['/messages']}>
          <GuestMessages />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() =>
      expect(axiosInstance.get).toHaveBeenCalledWith('/messages/?campaign=anna-and-alan')
    );
  });
});
