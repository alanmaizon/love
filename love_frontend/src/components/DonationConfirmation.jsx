import { useLocation, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useState } from 'react';

function DonationConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const donation = location.state?.donation;
  const [truelayerLink, setTruelayerLink] = useState(null);

  const handleTrueLayerPayment = async () => {
    try {
      const response = await axiosInstance.post('/create-truelayer-payment/', {
        amount: donation.amount,
        reference_id: `GIFT-${donation.id}`
      });
      setTruelayerLink(response.data.payment_link);
    } catch (error) {
      console.error('Error creating TrueLayer payment:', error);
    }
  };

  return (
    <div className="container mt-5">
      <h2>Gift Confirmation</h2>
      {donation ? (
        <>
          <p>Thank you, your gift has been submitted!</p>
          <ul>
            <li><strong>Name:</strong> {donation.donor_name}</li>
            <li><strong>Email:</strong> {donation.donor_email}</li>
            <li><strong>Amount:</strong> €{donation.amount}</li>
            <li><strong>Message:</strong> {donation.message || 'No message provided'}</li>
            <li><strong>Reference ID:</strong> GIFT-{donation.id}</li>
          </ul>

          <p><strong>Choose your payment method:</strong></p>

          {truelayerLink ? (
            <a href={truelayerLink} className="btn btn-success" target="_blank" rel="noopener noreferrer">
              Pay via Instant Bank Transfer (No Fees)
            </a>
          ) : (
            <button className="btn btn-success" onClick={handleTrueLayerPayment}>
              Generate Bank Transfer Link
            </button>
          )}

          <p className="mt-3">Or</p>

          <a href={`https://revolut.me/alanmaizon?amount=${donation.amount}&currency=EUR`} 
             className="btn btn-primary" target="_blank" rel="noopener noreferrer">
            Pay with Revolut
          </a>

          <p className="mt-3">Alternatively, you can manually transfer the amount using the following details:</p>
          <ul>
            <li><strong>Bank:</strong> Bank XYZ</li>
            <li><strong>Account Number:</strong> 12345678</li>
            <li><strong>Routing Number:</strong> 987654</li>
            <li><strong>Reference:</strong> GIFT-{donation.id}</li>
          </ul>
        </>
      ) : (
        <p>Your contribution was submitted successfully!</p>
      )}
      <button className="btn btn-secondary mt-3" onClick={() => navigate('/')}>
        Return Home
      </button>
    </div>
  );
}

export default DonationConfirmation;
