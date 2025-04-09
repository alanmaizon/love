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
      navigate('/confirmation', { state: { donation: response.data } });
    } catch (error) {
      console.error('Error submitting donation:', error);
      setFeedback('Error submitting donation. Please try again.');
    }
  };

  return (
    <div className="container mt-5">
      {feedback && (
        <div role="alert" className="alert alert-info">
          {feedback}
        </div>
      )}
      <form onSubmit={handleSubmit} noValidate role="form">
        <h2>Make a Gift</h2>
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
        <div className="mb-3" role="radiogroup" aria-labelledby="contributionAmountLabel">
          <label id="contributionAmountLabel" className="form-label">Contribution Amount</label>
          <div>
            {["20", "50", "100", "200", "custom"].map((value) => (
              <div key={value} className="form-check form-check-inline">
                <input
                  id={`amount-${value}`}
                  className="form-check-input"
                  type="radio"
                  name="amountOptions"
                  value={value}
                  checked={selectedAmount === value}
                  onChange={(e) => setSelectedAmount(e.target.value)}
                />
                <label className="form-check-label" htmlFor={`amount-${value}`}>
                  {value === "custom" ? "Custom" : `€${value}`}
                </label>
              </div>
            ))}
          </div>
          <small>Your donation amount is private</small>
        </div>
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
        <div className="mb-3">
          <label htmlFor="charity" className="form-label">Select one charity</label>
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
        <div className="mb-3">
          <label htmlFor="message" className="form-label">Write a message (Optional)</label>
          <textarea
            id="message"
            className="form-control"
            rows="3"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <small>This will be visible to others</small>
        </div>
        <button type="submit" className="btn btn-primary">Send Gift</button>
      </form>
    </div>
  );
}

export default DonationForm;
