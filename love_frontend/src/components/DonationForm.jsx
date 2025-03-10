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
  const [skipCharity, setSkipCharity] = useState(false);
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

    if (!skipCharity && !selectedCharity) {
      setFeedback('Please select a charity or choose to skip.');
      return;
    }

    const donationData = {
      donor_name: donorName,
      donor_email: donorEmail,
      amount: amountValue,
      message: message,
      charity: skipCharity ? null : selectedCharity,
      skipCharity: skipCharity,
    };

    try {
      const response = await axiosInstance.post('/donations/', donationData);
      navigate('/confirmation', { state: { donation: response.data, isCustomAmount: selectedAmount === 'custom' } });
    } catch (error) {
      console.error('Error submitting donation:', error);
      setFeedback('Error submitting donation. Please try again.');
    }
  };

  return (
    <div className="container mt-5">
      {feedback && <div role="alert" className="alert alert-info">{feedback}</div>}
      <form onSubmit={handleSubmit} noValidate>
        <h2>Make a Gift</h2>
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
        {/* Contribution Amount Options */}
        <div className="mb-3">
          <label className="form-label">Contribution Amount</label>
          <div>
            {/* Predefined Amounts */}
            {["10", "20", "50", "100"].map((value) => (
              <div className="form-check form-check-inline" key={value}>
                <input
                  id={`amount-${value}`}
                  className="form-check-input"
                  type="radio"
                  name="amountOptions"
                  value={value}
                  checked={selectedAmount === value}
                  onChange={(e) => setSelectedAmount(e.target.value)}
                />
                <label className="form-check-label" htmlFor={`amount-${value}`}>€{value}</label>
              </div>
            ))}
            {/* Custom Amount */}
            <div className="form-check form-check-inline">
              <input
                id="amount-custom"
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
        {/* Charity Dropdown or Skip Option */}
        <div className="mb-3">
          <label htmlFor="charity" className="form-label">Select a Charity</label>
          <select
            id="charity"
            className="form-select"
            value={selectedCharity}
            onChange={(e) => setSelectedCharity(e.target.value)}
            disabled={skipCharity}
            required={!skipCharity}
          >
            <option value="">-- Select a Charity --</option>
            {charities.map((charity) => (
              <option key={charity.id} value={charity.id}>
                {charity.name}
              </option>
            ))}
          </select>
        </div>
        {/* Checkbox to Skip Charity Selection */}
        <div className="mb-3">
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="skipCharity"
              checked={skipCharity}
              onChange={() => setSkipCharity(!skipCharity)}
            />
            <label className="form-check-label" htmlFor="skipCharity">
              I prefer not to select a specific charity. 50% of my donation will be evenly split among all charities.
            </label>
          </div>
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
        <button type="submit" className="btn btn-primary">Send Gift</button>
      </form>
    </div>
  );
}

export default DonationForm;
