import React, { useState } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';

function AddCharity() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState(null);
  const [feedback, setFeedback] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append('name', name);
    data.append('description', description);
    data.append('website', website);
    if (logo) {
      data.append('logo', logo);
    }

    try {
      await axiosInstance.post('/charities/', data, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setFeedback('Charity added successfully!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (error) {
      console.error(error);
      setFeedback('Error adding charity. Please try again.');
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
      <div className="w-50">
        <h2>Add New Charity</h2>
        {feedback && <div className="alert alert-info">{feedback}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="name" className="form-label">Charity Name</label>
            <input
              type="text"
              id="name"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="website" className="form-label">Website</label>
            <input
              type="url"
              id="website"
              className="form-control"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="logo" className="form-label">Logo</label>
            <input
              type="file"
              id="logo"
              className="form-control"
              onChange={(e) => setLogo(e.target.files[0])}
            />
          </div>
          <button type="submit" className="btn btn-primary">Add Charity</button>
        </form>
      </div>
    </div>
  );
}

export default AddCharity;
