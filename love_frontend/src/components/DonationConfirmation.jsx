import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { FaCcVisa, FaCcMastercard, FaLock } from 'react-icons/fa';

const DonationConfirmation = () => {
  const location = useLocation();
  const donation = location.state?.donation;

  const presetPaymentLinks = {
    10: import.meta.env.VITE_REVOLUT_LINK_10,
    20: import.meta.env.VITE_REVOLUT_LINK_20,
    50: import.meta.env.VITE_REVOLUT_LINK_50,
    100: import.meta.env.VITE_REVOLUT_LINK_100,
  };

  const customPaymentLink = import.meta.env.VITE_REVOLUT_LINK_CUSTOM;

  const paymentLink = presetPaymentLinks[donation.amount] || customPaymentLink;

  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = paymentLink;
    }, 4000);

    return () => clearTimeout(timer);
  }, [paymentLink]);

  return (
    <section className="flex flex-col items-center justify-center min-h-screen text-center">
      <h2 className="text-2xl font-semibold mb-4">Thank you for your generous donation of €{donation.amount}!</h2>
      <p className="mb-4">You'll be securely redirected to complete your payment shortly.</p>
      <div className="flex items-center space-x-2 mb-6 text-green-600">
        <FaLock size={30} />
        <span className="font-medium">Secure payment via Revolut</span>
      </div>
      <div className="flex items-center space-x-4 mb-6">
        <FaCcVisa size={60} className="text-blue-700" />
        <FaCcMastercard size={60} className="text-red-500" />
      </div>
      <a
        href={paymentLink}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline hover:text-blue-600"
      >
        Click here if you're not redirected automatically.
      </a>
    </section>
  );
};

export default DonationConfirmation;