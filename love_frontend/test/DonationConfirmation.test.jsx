import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import DonationConfirmation from '../src/components/DonationConfirmation';

describe('DonationConfirmation Component', () => {
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
});
