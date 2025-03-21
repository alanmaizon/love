import React, { useState, useEffect, useCallback } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate, useLocation } from 'react-router-dom';

function DonationForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedCharity = location.state?.selectedCharity || '';

  const [charities, setCharities] = useState([]);
  const [formState, setFormState] = useState({
    donorName: '',
    donorEmail: '',
    selectedAmount: '',
    customAmount: '',
    message: '',
    selectedCharity: preselectedCharity,
  });
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axiosInstance.get('/charities/')
      .then(response => setCharities(response.data))
      .catch(error => console.error('Error fetching charities:', error));
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    const amountValue = formState.selectedAmount === 'custom'
      ? parseFloat(formState.customAmount)
      : parseFloat(formState.selectedAmount);

    if (!amountValue || amountValue <= 0) {
      setFeedback('Please enter a valid donation amount.');
      return;
    }

    if (!formState.selectedCharity) {
      setFeedback('Please select a charity.');
      return;
    }

    setLoading(true);
    setFeedback('');

    try {
      const response = await axiosInstance.post('/donations/', {
        donor_name: formState.donorName,
        donor_email: formState.donorEmail,
        amount: amountValue,
        message: formState.message,
        charity: formState.selectedCharity,
      });
      navigate('/confirmation', { state: { donation: response.data } });
    } catch (error) {
      console.error('Error submitting donation:', error);
      setFeedback('Error submitting donation. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [formState, navigate]);

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
            name="donorName"
            className="form-control"
            value={formState.donorName}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="donorEmail" className="form-label">Email</label>
          <input
            type="email"
            id="donorEmail"
            name="donorEmail"
            className="form-control"
            value={formState.donorEmail}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3" role="radiogroup" aria-labelledby="contributionAmountLabel">
          <label id="contributionAmountLabel" className="form-label">Contribution Amount</label>
          <div>
            {["10", "20", "50", "100", "custom"].map(value => (
              <div key={value} className="form-check form-check-inline">
                <input
                  id={`amount-${value}`}
                  className="form-check-input"
                  type="radio"
                  name="selectedAmount"
                  value={value}
                  checked={formState.selectedAmount === value}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor={`amount-${value}`}>
                  {value === "custom" ? "Custom" : `€${value}`}
                </label>
              </div>
            ))}
          </div>
          <small>Your donation amount is private</small>
        </div>
        {formState.selectedAmount === "custom" && (
          <div className="mb-3">
            <label htmlFor="customAmount" className="form-label">Enter Custom Amount</label>
            <input
              type="number"
              id="customAmount"
              name="customAmount"
              className="form-control"
              value={formState.customAmount}
              onChange={handleChange}
            />
          </div>
        )}
        <div className="mb-3">
          <label htmlFor="selectedCharity" className="form-label">Select one charity</label>
          <select
            id="selectedCharity"
            name="selectedCharity"
            className="form-select"
            value={formState.selectedCharity}
            onChange={handleChange}
            required
          >
            <option value="">-- Select a Charity --</option>
            {charities.map(charity => (
              <option key={charity.id} value={charity.id}>{charity.name}</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label htmlFor="message" className="form-label">Write a message (Optional)</label>
          <textarea
            id="message"
            name="message"
            className="form-control"
            rows="3"
            value={formState.message}
            onChange={handleChange}
          />
          <small>This will be visible to others</small>
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Processing...' : 'Send Gift'}
        </button>
      </form>
    </div>
  );
}

export default DonationForm;
