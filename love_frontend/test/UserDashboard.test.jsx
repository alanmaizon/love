import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import UserDashboard from '../src/components/UserDashboard';
import '@testing-library/jest-dom';

vi.mock('axios')

describe('UserDashboard', () => {
  test('displays loading state initially', () => {
    axios.get.mockResolvedValueOnce({ data: [] });
    render(<UserDashboard />);
    expect(screen.getByText(/Loading donations/i)).toBeInTheDocument();
  });

  test('renders donations after fetch', async () => {
    const donationData = [
      {
        id: 1,
        donor_name: 'John Doe',
        donor_email: 'john@example.com',
        amount: 50,
        message: 'Great cause!',
        status: 'pending'
      }
    ];
    axios.get.mockResolvedValueOnce({ data: donationData });
    render(<UserDashboard />);
    // Wait for donation data to appear in the DOM.
    await waitFor(() => expect(screen.getByText(/John Doe/i)).toBeInTheDocument());
    expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
    expect(screen.getByText('$50')).toBeInTheDocument();
  });

  test('displays error message if fetch fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('API Error'));
    render(<UserDashboard />);
    await waitFor(() => expect(screen.getByText(/Error fetching donations/i)).toBeInTheDocument());
  });
});
