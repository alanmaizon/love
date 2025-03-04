// src/components/PaymentInstructions.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import PaymentInstructions from '../src/components/PaymentInstructions';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

describe('PaymentInstructions Component', () => {
  test('renders payment instructions with bank details', () => {
    render(
      <MemoryRouter>
        <PaymentInstructions />
      </MemoryRouter>
    );
    // Query specifically for the heading.
    expect(screen.getByRole('heading', { name: /Manual Payment Instructions/i })).toBeInTheDocument();
    expect(screen.getByText(/Example Bank/i)).toBeInTheDocument();
    expect(screen.getByText(/123456789/i)).toBeInTheDocument();
    expect(screen.getByText(/987654321/i)).toBeInTheDocument();
    expect(screen.getByText(/Return Home/i)).toBeInTheDocument();
  });
});
