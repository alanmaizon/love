// src/components/EditCharity.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function EditCharity() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [charity, setCharity] = useState({
    name: '',
    description: '',
    website: '',
  });
  const [logo, setLogo] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch charity details for the given ID
  useEffect(() => {
    const fetchCharity = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/charities/${id}/`, { withCredentials: true });
        setCharity(response.data);
        setLoading(false);
      } catch (err) {
        setFeedback('Error fetching charity details.');
        setLoading(false);
      }
    };
    fetchCharity();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prepare form data (handle file upload if a new logo is provided)
    const formData = new FormData();
    formData.append('name', charity.name);
    formData.append('description', charity.description);
    formData.append('website', charity.website);
    if (logo) {
      formData.append('logo', logo);
    }

    try {
      await axios.put(`http://localhost:8000/api/charities/${id}/`, formData, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setFeedback('Charity updated successfully!');
      // Optionally, redirect back to the charities list after a short delay.
      setTimeout(() => navigate('/dashboard/charities'), 1500);
    } catch (error) {
      console.error(error);
      setFeedback('Error updating charity. Please try again.');
    }
  };

  const handleChange = (e) => {
    setCharity({
      ...charity,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="container mt-5">
      <h2>Edit Charity</h2>
      {loading ? (
        <p>Loading charity details...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          {feedback && <div className="alert alert-info">{feedback}</div>}
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Charity Name</label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              value={charity.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              name="description"
              className="form-control"
              value={charity.description}
              onChange={handleChange}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="website" className="form-label">Website</label>
            <input
              type="url"
              id="website"
              name="website"
              className="form-control"
              value={charity.website}
              onChange={handleChange}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="logo" className="form-label">Logo (optional - select new file to update)</label>
            <input
              type="file"
              id="logo"
              className="form-control"
              onChange={(e) => setLogo(e.target.files[0])}
            />
          </div>
          <button type="submit" className="btn btn-primary">Save Changes</button>
        </form>
      )}
    </div>
  );
}

export default EditCharity;
