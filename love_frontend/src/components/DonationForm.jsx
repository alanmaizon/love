// src/components/DonationForm.jsx
import React, { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate, useLocation } from 'react-router-dom';

function DonationForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedCharity = location.state?.selectedCharity || '';

  const [charities, setCharities] = useState([]);
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [selectedAmount, setSelectedAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCharity, setSelectedCharity] = useState(preselectedCharity);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    axiosInstance.get('/charities/')
      .then(response => {
        setCharities(response.data);
      })
      .catch(error => {
        console.error('Error fetching charities:', error);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let amountValue;
    if (selectedAmount === 'custom') {
      amountValue = parseFloat(customAmount);
    } else {
      amountValue = parseFloat(selectedAmount);
    }

    if (!amountValue || amountValue <= 0) {
      setFeedback('Please enter a valid donation amount.');
      return;
    }

    const donationData = {
      donor_name: donorName,
      donor_email: donorEmail,
      amount: amountValue,
      message: message,
      charity: selectedCharity,
    };

    try {
      const response = await axiosInstance.post('/donations/', donationData);
      // Navigate to confirmation page, passing donation details if needed
      navigate('/confirmation', { state: { donation: response.data } });
    } catch (error) {
      console.error('Error submitting donation:', error);
      setFeedback('Error submitting donation. Please try again.');
    }
  };

  return (
    <div className="container mt-5">
      {feedback && <div role="alert" className="alert alert-info">{feedback}</div>}
      <form onSubmit={handleSubmit} noValidate>
        <h2>Make a Donation</h2>
        {/* Donor Name */}
        <div className="mb-3">
          <label htmlFor="donorName" className="form-label">Name</label>
          <input
            type="text"
            id="donorName"
            className="form-control"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            required
          />
        </div>
        {/* Donor Email */}
        <div className="mb-3">
          <label htmlFor="donorEmail" className="form-label">Email</label>
          <input
            type="email"
            id="donorEmail"
            className="form-control"
            value={donorEmail}
            onChange={(e) => setDonorEmail(e.target.value)}
            required
          />
        </div>
        {/* Donation Amount Options */}
        <div className="mb-3">
          <label className="form-label">Donation Amount</label>
          <div>
            <div className="form-check form-check-inline">
              <input
                id="amount-10"
                data-testid="radio-amount-10"
                className="form-check-input"
                type="radio"
                name="amountOptions"
                value="10"
                checked={selectedAmount === "10"}
                onChange={(e) => setSelectedAmount(e.target.value)}
              />
              <label className="form-check-label" htmlFor="amount-10">$10</label>
            </div>
            <div className="form-check form-check-inline">
              <input
                id="amount-20"
                data-testid="radio-amount-20"
                className="form-check-input"
                type="radio"
                name="amountOptions"
                value="20"
                checked={selectedAmount === "20"}
                onChange={(e) => setSelectedAmount(e.target.value)}
              />
              <label className="form-check-label" htmlFor="amount-20">$20</label>
            </div>
            <div className="form-check form-check-inline">
              <input
                id="amount-50"
                data-testid="radio-amount-50"
                className="form-check-input"
                type="radio"
                name="amountOptions"
                value="50"
                checked={selectedAmount === "50"}
                onChange={(e) => setSelectedAmount(e.target.value)}
              />
              <label className="form-check-label" htmlFor="amount-50">$50</label>
            </div>
            <div className="form-check form-check-inline">
              <input
                id="amount-100"
                data-testid="radio-amount-100"
                className="form-check-input"
                type="radio"
                name="amountOptions"
                value="100"
                checked={selectedAmount === "100"}
                onChange={(e) => setSelectedAmount(e.target.value)}
              />
              <label className="form-check-label" htmlFor="amount-100">$100</label>
            </div>
            <div className="form-check form-check-inline">
              <input
                id="amount-custom"
                data-testid="radio-amount-custom"
                className="form-check-input"
                type="radio"
                name="amountOptions"
                value="custom"
                checked={selectedAmount === "custom"}
                onChange={(e) => setSelectedAmount(e.target.value)}
              />
              <label className="form-check-label" htmlFor="amount-custom">Custom</label>
            </div>
          </div>
        </div>
        {/* Custom Amount Input */}
        {selectedAmount === "custom" && (
          <div className="mb-3">
            <label htmlFor="customAmount" className="form-label">Enter Custom Amount</label>
            <input
              type="number"
              id="customAmount"
              className="form-control"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
            />
          </div>
        )}
        {/* Charity Dropdown */}
        <div className="mb-3">
          <label htmlFor="charity" className="form-label">Select Charity</label>
          <select
            id="charity"
            className="form-select"
            value={selectedCharity}
            onChange={(e) => setSelectedCharity(e.target.value)}
            required
          >
            <option value="">-- Select a Charity --</option>
            {charities.map((charity) => (
              <option key={charity.id} value={charity.id}>
                {charity.name}
              </option>
            ))}
          </select>
        </div>
        {/* Personal Message */}
        <div className="mb-3">
          <label htmlFor="message" className="form-label">Personal Message (Optional)</label>
          <textarea
            id="message"
            className="form-control"
            rows="3"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary">Donate</button>
      </form>
    </div>
  );
}

export default DonationForm;
