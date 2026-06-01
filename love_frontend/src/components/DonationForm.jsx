// src/components/DonationForm.jsx
import React, { useState, useEffect, useContext } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function DonationForm() {
  const location = useLocation();
  const { campaign: flagshipCampaign } = useContext(AuthContext);
  const preselectedCharity = location.state?.selectedCharity || '';
  const slugFromQuery = new URLSearchParams(location.search).get('campaign');
  const [campaign, setCampaign] = useState(null);
  const [campaignLoading, setCampaignLoading] = useState(!!slugFromQuery);

  const [charities, setCharities] = useState([]);
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [selectedAmount, setSelectedAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCharity, setSelectedCharity] = useState(preselectedCharity);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const slug = slugFromQuery || flagshipCampaign?.slug;
    if (!slug) {
      setCampaign(null);
      setCampaignLoading(false);
      return undefined;
    }
    if (!slugFromQuery && flagshipCampaign?.slug === slug) {
      setCampaign(flagshipCampaign);
      setCampaignLoading(false);
      return undefined;
    }
    setCampaignLoading(true);
    axiosInstance.get(`/campaign/${slug}/`)
      .then((res) => setCampaign(res.data))
      .catch(() => setCampaign(null))
      .finally(() => setCampaignLoading(false));
  }, [slugFromQuery, flagshipCampaign]);

  useEffect(() => {
    axiosInstance.get('/csrf/').catch(() => {});
    axiosInstance.get('/charities/')
      .then(response => {
        const charityList = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.results)
            ? response.data.results
            : [];
        setCharities(charityList);
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

    if (campaignLoading) {
      setFeedback('Campaign is still loading. Please wait a moment.');
      return;
    }
    if (!campaign?.slug) {
      setFeedback('Missing campaign. Open donate from a campaign page or add ?campaign=slug to the URL.');
      return;
    }

    const donationData = {
      donor_name: donorName,
      donor_email: donorEmail,
      amount: amountValue,
      message: message,
      charity: selectedCharity,
      campaign: campaign.slug,
    };

    try {
      // v2: create donation + Stripe Checkout Session, then redirect to
      // Stripe-hosted Checkout (we never touch card data — PCI SAQ-A).
      setFeedback('Redirecting to secure checkout…');
      const response = await axiosInstance.post('/payments/checkout/', donationData);
      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        setFeedback('Could not start checkout. Please try again.');
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
      if (error.response?.status === 503) {
        setFeedback('Payments are not configured yet. Please try again later.');
      } else {
        setFeedback(error.response?.data?.error || 'Error starting checkout. Please try again.');
      }
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
        {campaign?.title && (
          <p className="text-muted">Supporting: <strong>{campaign.title}</strong></p>
        )}
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
            {Array.isArray(charities) && charities.map((charity) => (
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
