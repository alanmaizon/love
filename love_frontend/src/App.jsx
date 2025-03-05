// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './components/Login';
import Logout from './components/Logout';
import Home from './components/Home';
import ExploreCharities from './components/ExploreCharities'; 
import DonationForm from './components/DonationForm';
import DonationConfirmation from './components/DonationConfirmation';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import PaymentInstructions from './components/PaymentInstructions';
import AddCharity from './components/AddCharity';
import ManageCharities from './components/ManageCharities';
import EditCharity from './components/EditCharity';
import Profile from './components/Profile';
import PrivateRoute from './components/PrivateRoute'; 

function Header() {
  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/charities">Charities</Link>
      <Link to="/login">Login</Link>
      {/* or a brand logo, etc. */}
    </nav>
  );
}

function Footer() {
  return <footer> Love © 2025 by Anna & Alan</footer>;
}

function App() {
  return (
    <Router>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
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
