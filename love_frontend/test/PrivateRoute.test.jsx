import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@testing-library/jest-dom';
import PrivateRoute from '../src/components/PrivateRoute';
import { AuthContext } from '../src/context/AuthContext';

const Secret = () => <div>Secret area</div>;

const renderPrivate = ({ authUser = null, authReady = false, path = '/secret' } = {}) =>
  render(
    <AuthContext.Provider value={{ authUser, authReady, setAuthUser: vi.fn() }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/secret" element={<PrivateRoute><Secret /></PrivateRoute>} />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );

describe('PrivateRoute', () => {
  test('shows loading while auth session is being checked', () => {
    renderPrivate({ authReady: false });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByText('Secret area')).not.toBeInTheDocument();
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  test('renders children when authenticated', () => {
    renderPrivate({
      authReady: true,
      authUser: { username: 'anna_alan', displayName: 'Anna', isAdmin: false, charities: [] },
    });
    expect(screen.getByText('Secret area')).toBeInTheDocument();
  });

  test('redirects to login when auth check finished and user is absent', () => {
    renderPrivate({ authReady: true, authUser: null });
    expect(screen.getByText('Login page')).toBeInTheDocument();
    expect(screen.queryByText('Secret area')).not.toBeInTheDocument();
  });
});
