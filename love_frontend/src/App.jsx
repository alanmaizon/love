// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import React, { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import logo from '../public/brand-logo.svg';
import ScrollToTop from "./components/ScrollToTop";
import ScrollToTopButton from "./components/ScrollToTopButton";
import Home from './components/Home';
import Login from './components/Login';
import Logout from './components/Logout';
import Profile from './components/Profile';
import ExploreCharities from './components/ExploreCharities';
import DonationForm from './components/DonationForm';
import DonationConfirmation from './components/DonationConfirmation';
import UserDashboard from './components/UserDashboard';
import AddCharity from './components/AddCharity';
import ManageCharities from './components/ManageCharities';
import EditCharity from './components/EditCharity';
import AdminDashboard from './components/AdminDashboard';
import PrivateRoute from './components/PrivateRoute';
import GuestMessages from './components/GuestMessages';
import Bio from './components/About';

function Header() {
  const { authUser } = useContext(AuthContext);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <img 
            src={logo}
            alt="Logo" 
            style={{ height: '50px', marginRight: '8px' }} 
          />
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link className="nav-link" to="/messages">Guestbook</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/charities">Charities</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/bio">About Us</Link>
            </li>
            <li className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#!"
                id="userDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                {authUser ? authUser.username : "Account"}
              </a>
              <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="userDropdown">
                {authUser ? (
                  <>
                    <li>
                      <Link className="dropdown-item" to="/dashboard">Dashboard</Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/profile">Profile</Link>
                    </li>
                    {authUser.isAdmin && (
                      <li>
                        <Link className="dropdown-item" to="/admin">Admin</Link>
                      </li>
                    )}
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <Link className="dropdown-item" to="/logout">Logout</Link>
                    </li>
                  </>
                ) : (
                  <li>
                    <Link className="dropdown-item" to="/login">Login</Link>
                  </li>
                )}
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container text-center">
        <p className="mb-0">Love that gives back © 2025</p>
      </div>
    </footer>
  );
}

function App() {
  return (
    <Router>
      <ScrollToTop /> 
      <div className="app-container">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/charities" element={<ExploreCharities />} />
            <Route path="/donate" element={<DonationForm />} />
            <Route path="/confirmation" element={<DonationConfirmation />} />
            <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
            <Route path="/dashboard/add-charity" element={<PrivateRoute><AddCharity /></PrivateRoute>} />
            <Route path="/dashboard/charities" element={<PrivateRoute><ManageCharities /></PrivateRoute>} />
            <Route path="/dashboard/charities/edit/:id" element={<PrivateRoute><EditCharity /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
            <Route path="/messages" element={<GuestMessages />} />
            <Route path="/bio" element={<Bio />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <ScrollToTopButton />
    </Router>
  );
}

export default App;
