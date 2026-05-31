// test/AdminDashboard.test.jsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AdminDashboard from '../src/components/AdminDashboard';
import axiosInstance from '../src/api/axiosInstance';

vi.mock('../src/api/axiosInstance', () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));

const pending = {
  id: 1,
  donor_name: 'John Doe',
  donor_email: 'john@example.com',
  amount: 50,
  message: 'Great cause!',
  status: 'pending',
};

describe('AdminDashboard', () => {
  beforeEach(() => vi.clearAllMocks());

  // NOTE: exact button names — `/fail/i` would also match the "Confirmed / Failed"
  // tab, and `/confirm/i` the "Confirmed / Failed" tab, clicking the wrong control.
  test('renders pending donations with Confirm/Fail actions', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: [pending] });
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fail' })).toBeInTheDocument();
  });

  test('unwraps a paginated {results: [...]} response', async () => {
    axiosInstance.get.mockResolvedValueOnce({ data: { results: [pending] } });
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
  });

  test('confirm button PATCHes the confirm endpoint', async () => {
    axiosInstance.get
      .mockResolvedValueOnce({ data: [pending] })                                  // initial load
      .mockResolvedValueOnce({ data: [{ ...pending, status: 'confirmed' }] });     // refetch
    axiosInstance.patch.mockResolvedValueOnce({});

    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() =>
      expect(axiosInstance.patch).toHaveBeenCalledWith('/donations/1/confirm/', {})
    );
  });

  test('fail button PATCHes the fail endpoint', async () => {
    axiosInstance.get
      .mockResolvedValueOnce({ data: [pending] })
      .mockResolvedValueOnce({ data: [{ ...pending, status: 'failed' }] });
    axiosInstance.patch.mockResolvedValueOnce({});

    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText('John Doe')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Fail' }));
    await waitFor(() =>
      expect(axiosInstance.patch).toHaveBeenCalledWith('/donations/1/fail/', {})
    );
  });

  test('shows an error message if the fetch fails', async () => {
    axiosInstance.get.mockRejectedValueOnce(new Error('API Error'));
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText(/error fetching donations/i)).toBeInTheDocument());
  });
});
