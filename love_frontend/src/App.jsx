import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import React, { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import logo from '../public/brand-logo.svg';
import ScrollToTop from "./components/ScrollToTop";
import ScrollToTopButton from "./components/ScrollToTopButton";
import Home from './components/Home';
import CampaignPage from './components/CampaignPage';
import ExploreCampaigns from './components/ExploreCampaigns';
import GetStarted from './components/GetStarted';
import Register from './components/Register';
import CoupleOnboarding from './components/onboarding/CoupleOnboarding';
import CharityOnboarding from './components/onboarding/CharityOnboarding';
import CampaignManage from './components/CampaignManage';
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
import About from './components/About';
import AnalyticsPage from './components/AnalyticsPage';

import TermsOfService from './components/TermsOfService';
import PrivacyPolicy from './components/PrivacyPolicy';

function Header() {
  const authContext = useContext(AuthContext) ?? {};
  const { authUser } = authContext;
  const authed = Boolean(authUser);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark" role="navigation" aria-label="Main Navigation">
      <div className="container">
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <img 
            src={logo}
            alt="Love That Gives Back Logo" 
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
            {!authed && (
              <li className="nav-item">
                <Link className="nav-link" to="/get-started">Get started</Link>
              </li>
            )}
            {authed && (
              <li className="nav-item">
                <Link className="nav-link" to="/dashboard">Dashboard</Link>
              </li>
            )}
            <li className="nav-item">
              <Link className="nav-link" to="/campaigns">Campaigns</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/charities">Charities</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/analytics">Analytics</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/about">About Us</Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container text-center">
        <p className="mb-0">
          Love That Gives Back © 2025
          <br />
          <span className="footer-links ms-2">
            <Link to="/terms-of-service" className="footer-link">Terms of Service</Link> | 
            <Link to="/privacy-policy" className="footer-link ms-1">Privacy Policy</Link>
          </span>
        </p>
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
        <main className="main-content" role="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/get-started" element={<GetStarted />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding/couple" element={<CoupleOnboarding />} />
            <Route path="/onboarding/charity" element={<CharityOnboarding />} />
            <Route path="/c/:slug" element={<CampaignPage />} />
            <Route path="/campaigns" element={<ExploreCampaigns />} />
            <Route path="/login" element={<Login />} />
            <Route path="/logout" element={<Logout />} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/charities" element={<ExploreCharities />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/donate" element={<DonationForm />} />
            <Route path="/confirmation" element={<DonationConfirmation />} />
            <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
            <Route path="/dashboard/campaigns/:slug" element={<PrivateRoute><CampaignManage /></PrivateRoute>} />
            <Route path="/dashboard/add-charity" element={<PrivateRoute><AddCharity /></PrivateRoute>} />
            <Route path="/dashboard/charities" element={<PrivateRoute><ManageCharities /></PrivateRoute>} />
            <Route path="/dashboard/charities/edit/:id" element={<PrivateRoute><EditCharity /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
            <Route path="/messages" element={<GuestMessages />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <ScrollToTopButton />
    </Router>
  );
}

export default App;
