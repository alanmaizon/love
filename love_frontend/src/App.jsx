// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import 'react-toastify/dist/ReactToastify.css';
import Home from './pages/Home';
import Login from './pages/Login';
import Logout from './pages/Logout';
import Profile from './pages/Profile';
import ExploreCharities from './pages/ExploreCharities';
import DonationForm from './pages/DonationForm';
import DonationConfirmation from './pages/DonationConfirmation';
import UserDashboard from './pages/UserDashboard';
import AddCharity from './pages/AddCharity';
import ManageCharities from './pages/ManageCharities';
import EditCharity from './pages/EditCharity';
import AdminDashboard from './pages/AdminDashboard';
import PaymentInstructions from './pages/PaymentInstructions';
import PrivateRoute from './components/PrivateRoute';

// ... other imports

function Header() {
  const { user } = useContext(AuthContext);

  return (
    <nav style={{ display: 'flex', gap: '1rem' }}>
      <Link to="/">Home</Link>
      <Link to="/charities">Charities</Link>

      {user ? (
        <>
          {/* Example if we store user.username in AuthContext */}
          <span>Hello, {user.username || 'User'}!</span>
          <Link to="/logout">Logout</Link>
        </>
      ) : (
        <Link to="/login">Login</Link>
      )}
    </nav>
  );
}

function Footer() {
  return <footer> Love © 2025 by Anna & Alan</footer>;
}

function App() {
  return (
    <Router>
      <ToastContainer position="top-right" autoClose={3000} />

      <Header />

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
        <Route path="/payment-instructions" element={<PaymentInstructions />} />
      </Routes>

      <Footer />
    </Router>
  );
}

export default App;
