// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';
import 'react-toastify/dist/ReactToastify.css';

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
