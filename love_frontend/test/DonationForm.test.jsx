// test/DonationForm.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import DonationForm from '../src/components/DonationForm';
import axiosInstance from '../src/api/axiosInstance';

vi.mock('../src/api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const renderForm = () =>
  render(<MemoryRouter><DonationForm /></MemoryRouter>);

const loadCharities = () =>
  axiosInstance.get.mockResolvedValueOnce({
    data: [
      { id: 1, name: 'Charity One' },
      { id: 2, name: 'Charity Two' },
    ],
  });

describe('DonationForm (v2: Stripe Checkout)', () => {
  beforeEach(() => vi.clearAllMocks());

  test('shows the custom amount input when "Custom" is selected', async () => {
    loadCharities();
    renderForm();
    await waitFor(() => screen.getByText(/-- Select a Charity --/i));
    fireEvent.click(screen.getByLabelText(/^custom$/i));
    expect(screen.getByLabelText(/enter custom amount/i)).toBeInTheDocument();
  });

  test('shows a validation error when the amount is missing', async () => {
    loadCharities();
    renderForm();
    await waitFor(() => screen.getByText(/-- Select a Charity --/i));

    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send gift/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/please enter a valid donation amount/i)
    );
    expect(axiosInstance.post).not.toHaveBeenCalled();
  });

  test('posts to the checkout endpoint when the form is filled in', async () => {
    loadCharities();
    axiosInstance.post.mockResolvedValueOnce({ data: { checkout_url: 'https://stripe.test/cs_123' } });
    // jsdom can't perform real navigation; make location.href assignable so the
    // success path (window.location.href = checkout_url) doesn't throw.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    });

    renderForm();
    await waitFor(() => screen.getByText(/-- Select a Charity --/i));

    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/^email$/i), { target: { value: 'john@example.com' } });
    fireEvent.click(screen.getByLabelText('€50'));
    fireEvent.change(screen.getByLabelText(/select one charity/i), { target: { value: '1' } });

    fireEvent.click(screen.getByRole('button', { name: /send gift/i }));

    await waitFor(() => expect(axiosInstance.post).toHaveBeenCalled());
    const [url, body] = axiosInstance.post.mock.calls[0];
    expect(url).toBe('/payments/checkout/');
    expect(body).toMatchObject({
      donor_name: 'John Doe',
      donor_email: 'john@example.com',
      amount: 50,
      charity: '1',
    });
  });
});
