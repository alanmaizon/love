// test/UserDashboard.test.jsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import UserDashboard from '../src/components/UserDashboard';
import axiosInstance from '../src/api/axiosInstance';
import { AuthProvider } from '../src/context/AuthContext';

vi.mock('../src/api/axiosInstance', () => ({
  default: { get: vi.fn() },
}));

const renderDash = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <UserDashboard />
      </AuthProvider>
    </MemoryRouter>,
  );

describe('UserDashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  test('shows a loading state initially', () => {
    axiosInstance.get.mockImplementation(() => new Promise(() => {}));
    renderDash();
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  test('renders my registries for a signed-in host', async () => {
    axiosInstance.get.mockImplementation((url) => {
      if (url === '/csrf/') return Promise.resolve({ data: {} });
      if (url === '/me/') {
        return Promise.resolve({
          data: {
            authenticated: true,
            username: 'host',
            display_name: 'Sam',
            isAdmin: false,
            charities: [],
          },
        });
      }
      if (url === '/campaigns/mine/') {
        return Promise.resolve({
          data: [{ id: 1, title: 'Our Day', slug: 'our-day', status: 'active' }],
        });
      }
      return Promise.reject(new Error('unexpected'));
    });
    renderDash();
    await waitFor(() => expect(screen.getByText('Our Day')).toBeInTheDocument());
    expect(screen.getByText(/my registries/i)).toBeInTheDocument();
  });

  test('shows an error message if the fetch fails', async () => {
    axiosInstance.get.mockRejectedValue(new Error('API Error'));
    renderDash();
    await waitFor(() => expect(screen.getByText(/could not load dashboard/i)).toBeInTheDocument());
  });
});
