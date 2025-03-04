// src/components/Login.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Login from '../src/components/Login';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Use Vitest's API instead of Jest's
vi.mock('axios');

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders the login form', () => {
    renderWithRouter(<Login />);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('displays success message on successful login', async () => {
    axios.post.mockResolvedValueOnce({ data: { message: 'Login successful' } });
    renderWithRouter(<Login />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'testpass' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/login successful/i)).toBeInTheDocument();
    });
  });

  test('displays error message on login failure', async () => {
    axios.post.mockRejectedValueOnce({
      response: { data: { error: 'Invalid credentials' } }
    });
    renderWithRouter(<Login />);
    
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
