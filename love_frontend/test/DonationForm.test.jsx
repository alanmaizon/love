// src/components/DonationForm.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DonationForm from '../src/components/DonationForm';
import axios from 'axios';
import { BrowserRouter } from 'react-router-dom';

// Wrap components in BrowserRouter so that routing-dependent components work
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// We mock axios so that our tests don't make real HTTP calls.
vi.mock('axios')


describe('DonationForm Component - Additional Tests', () => {
  beforeEach(() => {
    // Mock charities API call for useEffect
    axios.get.mockResolvedValueOnce({
      data: [
        { id: 1, name: 'Charity One' },
        { id: 2, name: 'Charity Two' }
      ]
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('shows custom amount input when "Custom" is selected', async () => {
    renderWithRouter(<DonationForm />);
    // Wait for charities to load
    await waitFor(() => screen.getByText(/-- Select a Charity --/i));

    // Select the "Custom" radio option.
    const customRadio = screen.getByLabelText(/Custom/i);
    fireEvent.click(customRadio);

    // Check that the custom amount input appears.
    expect(screen.getByLabelText(/Enter Custom Amount/i)).toBeInTheDocument();
  });
 
  test('shows validation error when donation amount is missing', async () => {
    renderWithRouter(<DonationForm />);
    // Wait for charities to load
    await waitFor(() => screen.getByText(/-- Select a Charity --/i));
    
    // Fill in required fields except the donation amount.
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
    
    // Select the "Custom" option, which should display the custom amount input.
    fireEvent.click(screen.getByTestId('radio-amount-custom'));
    
    // Fill in the Charity dropdown so native validation doesn't block submission.
    fireEvent.change(screen.getByLabelText(/Select Charity/i), { target: { value: '1' } });

    // Leave the custom amount input empty, then submit the form.
    const donateButton = screen.getByRole('button', { name: /Donate/i });
    fireEvent.click(donateButton);
    
    // Wait for the validation feedback to appear.
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid donation amount.');
    });
  });  
  

  test('submits donation when form is filled correctly', async () => {
    // Mock the POST request to donations endpoint to return a successful response.
    axios.post.mockResolvedValueOnce({
      data: {
        id: 1,
        donor_name: 'John Doe',
        donor_email: 'john@example.com',
        amount: 50,
        message: 'Great cause!',
        status: 'pending'
      }
    });

    renderWithRouter(<DonationForm />);
    // Wait for charities to load
    await waitFor(() => screen.getByText(/-- Select a Charity --/i));

    // Fill in the form fields.
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'john@example.com' } });
    
    // Select a preset donation amount (e.g., $50)
    fireEvent.click(screen.getByTestId('radio-amount-50'));

    
    // Select a charity from the dropdown.
    fireEvent.change(screen.getByLabelText(/Select Charity/i), { target: { value: '1' } });
    // Optionally fill in a message.
    fireEvent.change(screen.getByLabelText(/Personal Message/i), { target: { value: 'Great cause!' } });
    
    // Submit the form.
    const donateButton = screen.getByRole('button', { name: /Donate/i });
    fireEvent.click(donateButton);

    // Wait for navigation (redirection) or a success message.
    // Since our component redirects on success, we can mock the useNavigate hook if needed,
    // but for now we'll check that axios.post was called with the correct data.
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        'http://localhost:8000/api/donations/',
        expect.objectContaining({
          donor_name: 'John Doe',
          donor_email: 'john@example.com',
          amount: 50,
          message: 'Great cause!',
          charity: '1'
        }),
        { withCredentials: true }
      );
    });
  });
});

