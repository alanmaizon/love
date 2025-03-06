// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import Header from './components/Header';
import Footer from './components/Footer';
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
import PaymentInstructions from './components/PaymentInstructions';

function App() {
  return (
    <Router>
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
