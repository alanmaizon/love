// test/UserDashboard.test.jsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import UserDashboard from '../src/components/UserDashboard';
import axiosInstance from '../src/api/axiosInstance';

vi.mock('../src/api/axiosInstance', () => ({
  default: { get: vi.fn() },
}));

const renderDash = () =>
  render(<MemoryRouter><UserDashboard /></MemoryRouter>);

describe('UserDashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  test('shows a loading state initially', () => {
    axiosInstance.get.mockReturnValueOnce(new Promise(() => {})); // never resolves
    renderDash();
    expect(screen.getByText(/loading donations/i)).toBeInTheDocument();
  });

  test('renders donations after fetch (v2: euro amounts, donor email)', async () => {
    axiosInstance.get.mockResolvedValueOnce({
      data: [
        {
          id: 1,
          donor_name: 'John Doe',
          donor_email: 'john@example.com',
          amount: 50,
          message: 'Great cause!',
          status: 'confirmed',
        },
      ],
    });
    renderDash();
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('€50')).toBeInTheDocument();
    expect(screen.getByText(/confirmed/i)).toBeInTheDocument();
  });

  test('shows an error message if the fetch fails', async () => {
    axiosInstance.get.mockRejectedValueOnce(new Error('API Error'));
    renderDash();
    await waitFor(() => expect(screen.getByText(/error fetching donations/i)).toBeInTheDocument());
  });
});
