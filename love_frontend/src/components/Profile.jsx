// src/components/Profile.jsx
// v2: the single-couple Profile (incl. bank fields) was retired. This is now a
// minimal account page showing the signed-in user. Campaign details are edited
// via the campaign/host dashboard; charity payouts via Stripe Connect — we never
// collect bank details in the app.
import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Profile() {
  const { authUser } = useContext(AuthContext) ?? {};

  if (!authUser) {
    return (
      <div className="container mt-5">
        <p>You are not signed in.</p>
        <Link to="/login" className="btn btn-primary">Log in</Link>
      </div>
    );
  }

  return (
    <div className="container mt-5">
      <h2>Your Account</h2>
      <ul className="list-group mt-3" style={{ maxWidth: 420 }}>
        <li className="list-group-item d-flex justify-content-between">
          <span>Username</span><strong>{authUser.username}</strong>
        </li>
        {authUser.displayName && (
          <li className="list-group-item d-flex justify-content-between">
            <span>Display name</span><strong>{authUser.displayName}</strong>
          </li>
        )}
        <li className="list-group-item d-flex justify-content-between">
          <span>Role</span>
          <strong>{authUser.isAdmin ? 'Administrator' : 'Member'}</strong>
        </li>
      </ul>

      {authUser.isAdmin && (
        <div className="mt-4">
          <Link to="/admin" className="btn btn-outline-secondary me-2">Admin dashboard</Link>
          <Link to="/dashboard/charities" className="btn btn-outline-secondary">Manage charities</Link>
        </div>
      )}
    </div>
  );
}

export default Profile;
