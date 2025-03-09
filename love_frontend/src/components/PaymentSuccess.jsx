import { useState } from 'react';
import axiosInstance from '../api/axiosInstance';

function PaymentSuccess() {
  const [referenceId, setReferenceId] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/mark-as-paid/', { reference_id: referenceId });
      setMessage(response.data.message);
    } catch (error) {
      setMessage('Invalid Reference ID. Please check and try again.');
    }
  };

  return (
    <div className="container mt-5">
      <h2>Confirm Your Payment</h2>
      <p>Enter your Reference ID to notify the couple that your gift has been transferred.</p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          className="form-control"
          placeholder="Enter Reference ID"
          value={referenceId}
          onChange={(e) => setReferenceId(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-success mt-2">Submit</button>
      </form>
      {message && <p className="alert alert-info mt-3">{message}</p>}
    </div>
  );
}

export default PaymentSuccess;
