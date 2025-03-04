// src/components/AdminDashboard.test.jsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import axios from 'axios';
import AdminDashboard from '../src/components/AdminDashboard';
import '@testing-library/jest-dom';

vi.mock('axios');

describe('AdminDashboard', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const setupAxiosGetMock = (donationData, analyticsData) => {
    // This mock implementation handles any axios.get call.
    axios.get.mockImplementation((url) => {
      if (url.includes('/api/analytics/')) {
        return Promise.resolve({ data: analyticsData });
      } else if (url.includes('/api/donations/')) {
        return Promise.resolve({ data: donationData });
      }
      return Promise.resolve({ data: {} });
    });
  };

  test('renders admin dashboard with donation data', async () => {
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
    const analyticsData = { total_amount: 0, donations_count: 0, count_per_charity: [] };

    setupAxiosGetMock(donationData, analyticsData);

    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText(/John Doe/i)).toBeInTheDocument());
    expect(screen.getByText(/pending/i)).toBeInTheDocument();
  });

  test('confirm donation button updates status', async () => {
    let statusUpdated = false;
    const donationDataInitial = [
      {
        id: 1,
        donor_name: 'John Doe',
        donor_email: 'john@example.com',
        amount: 50,
        message: 'Great cause!',
        status: 'pending'
      }
    ];
    const donationDataUpdated = [{ ...donationDataInitial[0], status: 'confirmed' }];
    const analyticsDataInitial = { total_amount: 0, donations_count: 0, count_per_charity: [] };
    const analyticsDataUpdated = { total_amount: 50, donations_count: 1, count_per_charity: [{ charity: 1, count: 1 }] };

    axios.get.mockImplementation((url) => {
      if (url.includes('/api/analytics/')) {
        return Promise.resolve({ data: statusUpdated ? analyticsDataUpdated : analyticsDataInitial });
      } else if (url.includes('/api/donations/')) {
        return Promise.resolve({ data: statusUpdated ? donationDataUpdated : donationDataInitial });
      }
      return Promise.resolve({ data: {} });
    });

    axios.patch.mockResolvedValueOnce({});

    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText(/John Doe/i)).toBeInTheDocument());
    const confirmButton = screen.getByRole('button', { name: /Confirm/i });
    fireEvent.click(confirmButton);
    // Simulate the update.
    statusUpdated = true;
    await waitFor(() =>
      expect(screen.getByTestId('donation-status-1')).toHaveTextContent(/^Confirmed$/i)
    );
  });

  test('fail donation button updates status', async () => {
    let statusUpdated = false;
    const donationDataInitial = [
      {
        id: 1,
        donor_name: 'John Doe',
        donor_email: 'john@example.com',
        amount: 50,
        message: 'Great cause!',
        status: 'pending'
      }
    ];
    const donationDataUpdated = [{ ...donationDataInitial[0], status: 'failed' }];
    const analyticsDataInitial = { total_amount: 0, donations_count: 0, count_per_charity: [] };
    // For failed donation, analytics may remain zero.
    const analyticsDataUpdated = { total_amount: 0, donations_count: 0, count_per_charity: [] };

    axios.get.mockImplementation((url) => {
      if (url.includes('/api/analytics/')) {
        return Promise.resolve({ data: statusUpdated ? analyticsDataUpdated : analyticsDataInitial });
      } else if (url.includes('/api/donations/')) {
        return Promise.resolve({ data: statusUpdated ? donationDataUpdated : donationDataInitial });
      }
      return Promise.resolve({ data: {} });
    });

    axios.patch.mockResolvedValueOnce({});

    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText(/John Doe/i)).toBeInTheDocument());
    const failButton = screen.getByRole('button', { name: /Fail/i });
    fireEvent.click(failButton);
    statusUpdated = true;
    await waitFor(() =>
      expect(screen.getByTestId('donation-status-1')).toHaveTextContent(/^Failed$/i)
    );
  });

  test('displays error message if donation fetch fails', async () => {
    axios.get.mockRejectedValueOnce(new Error('API Error'));
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText(/Error fetching donations/i)).toBeInTheDocument());
  });
});

test('renders analytics section with only confirmed donation data', async () => {
  // Simulate donation data with mixed statuses.
  const donationData = [
    {
      id: 1,
      donor_name: 'John Doe',
      donor_email: 'john@example.com',
      amount: 50,
      message: 'Great cause!',
      status: 'confirmed'
    },
    {
      id: 2,
      donor_name: 'Jane Smith',
      donor_email: 'jane@example.com',
      amount: 100,
      message: 'Keep it up!',
      status: 'pending'
    }
  ];
  const analyticsData = {
    total_amount: 50,        // Only confirmed donation (John Doe)
    donations_count: 1,
    count_per_charity: [{ charity: 1, count: 1 }]
  };

  axios.get.mockImplementation((url) => {
    if (url.includes('/api/analytics/')) {
      return Promise.resolve({ data: analyticsData });
    } else if (url.includes('/api/donations/')) {
      return Promise.resolve({ data: donationData });
    }
    return Promise.resolve({ data: {} });
  });

  render(<AdminDashboard />);
  // Wait for the donations to load.
  await waitFor(() => expect(screen.getByText(/John Doe/i)).toBeInTheDocument());
  // Wait for the analytics heading to appear.
  await waitFor(() => expect(screen.getByRole('heading', { name: /Analytics/i })).toBeInTheDocument());
  // Now check the total donation amount.
  expect(screen.getByTestId('total-amount-value')).toHaveTextContent(/\$50/i);
  expect(screen.getByTestId('donations-count')).toHaveTextContent('1');
  expect(screen.getByText(/Charity 1: 1 donations/i)).toBeInTheDocument();
});
