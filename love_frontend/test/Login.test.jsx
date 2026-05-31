// test/Login.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import Login from '../src/components/Login';
import { AuthContext } from '../src/context/AuthContext';
import axiosInstance from '../src/api/axiosInstance';

// Mock the shared axios instance (not `axios`), so the real interceptor setup in
// axiosInstance.js is never executed under test.
vi.mock('../src/api/axiosInstance', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

const renderLogin = (ctx = {}) =>
  render(
    <AuthContext.Provider value={{ authUser: null, setAuthUser: vi.fn(), ...ctx }}>
      <BrowserRouter><Login /></BrowserRouter>
    </AuthContext.Provider>
  );

describe('Login', () => {
  beforeEach(() => vi.clearAllMocks());

  test('renders the login form', () => {
    renderLogin();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  test('logs in, sets auth user from /me/, and navigates to the dashboard', async () => {
    const setAuthUser = vi.fn();
    axiosInstance.post.mockResolvedValueOnce({ data: { message: 'Login successful' } });
    axiosInstance.get.mockResolvedValueOnce({
      data: { username: 'anna_alan', display_name: 'Anna & Alan', isAdmin: false },
    });

    renderLogin({ setAuthUser });
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'anna_alan' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() =>
      expect(setAuthUser).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'anna_alan', displayName: 'Anna & Alan', isAdmin: false })
      )
    );
    expect(axiosInstance.post).toHaveBeenCalledWith('/login/', { username: 'anna_alan', password: 'pw' });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/dashboard'));
  });

  test('shows an error message on failed login', async () => {
    axiosInstance.post.mockRejectedValueOnce({ response: { data: { error: 'Invalid credentials' } } });
    renderLogin();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument());
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
