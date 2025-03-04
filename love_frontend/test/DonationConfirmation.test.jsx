// src/components/DonationConfirmation.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import DonationConfirmation from '../src/components/DonationConfirmation';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const renderWithRouter = (ui, { route = '/', locationState } = {}) => {
  return render(
    <MemoryRouter initialEntries={[{ pathname: route, state: locationState }]}>
      <Routes>
        <Route path="/" element={ui} />
      </Routes>
    </MemoryRouter>
  );
};

describe('DonationConfirmation Component', () => {
  test('renders confirmation message with donation details when provided', () => {
    const donation = {
      donor_name: 'John Doe',
      donor_email: 'john@example.com',
      amount: 50,
      message: 'Great cause!'
    };
    renderWithRouter(<DonationConfirmation />, { locationState: { donation } });
    
    expect(screen.getByText(/thank you, your donation has been submitted successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/john doe/i)).toBeInTheDocument();
    expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/\$50/i)).toBeInTheDocument();
    expect(screen.getByText(/great cause!/i)).toBeInTheDocument();
  });

  test('renders generic confirmation message when no donation details provided', () => {
    renderWithRouter(<DonationConfirmation />, { locationState: {} });
    
    expect(screen.getByText(/your donation was submitted successfully/i)).toBeInTheDocument();
  });
});
