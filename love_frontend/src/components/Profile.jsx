import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

function Profile() {
  const [profile, setProfile] = useState({
    bride_name: '',
    groom_name: '',
    wedding_date: '',
    bio: '',
    location: '',
    profile_picture: '',
    bank_name: '',
    account_number: '',
    revolut_username: '', // Updated key
  });
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch profile details on mount, redirect if not authenticated
  useEffect(() => {
    axiosInstance.get('/profile/', { withCredentials: true })
      .then(response => {
        setProfile(response.data);
        setLoading(false);
      })
      .catch(error => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            navigate('/');
        } else {
          setFeedback('Error fetching profile data.');
          setLoading(false);
        }
      });
  }, [navigate]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setProfile({ ...profile, profile_picture: e.target.files[0] });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('bride_name', profile.bride_name);
    formData.append('groom_name', profile.groom_name);
    formData.append('wedding_date', profile.wedding_date);
    formData.append('bio', profile.bio);
    formData.append('location', profile.location);
    formData.append('bank_name', profile.bank_name);
    formData.append('account_number', profile.account_number);
    formData.append('revolut_username', profile.revolut_username);
    if (profile.profile_picture instanceof File) {
      formData.append('profile_picture', profile.profile_picture);
    }
    axiosInstance.put('/profile/', formData, {
      withCredentials: true,
      headers: { 'Content-Type': 'multipart/form-data' }
    })
      .then(response => {
        setFeedback('Profile updated successfully!');
        setTimeout(() => navigate('/'), 1500);
      })
      .catch(error => {
        setFeedback('Error updating profile.');
      });
  };

  if (loading) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="container mt-5">
      {feedback && <div className="alert alert-info">{feedback}</div>}
      {/* Display current profile picture */}
      {profile.profile_picture_url && (
        <img
          src={profile.profile_picture_url}
          alt="Profile"
          className="img-fluid rounded-circle mb-3"
          style={{ maxWidth: '150px' }}
        />
      )}
      <form onSubmit={handleSubmit}>
        <h2>Edit Profile</h2>
        <div className="mb-3">
          <label htmlFor="bride_name" className="form-label">Bride Name</label>
          <input
            type="text"
            id="bride_name"
            name="bride_name"
            className="form-control"
            value={profile.bride_name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="groom_name" className="form-label">Groom Name</label>
          <input
            type="text"
            id="groom_name"
            name="groom_name"
            className="form-control"
            value={profile.groom_name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="wedding_date" className="form-label">Wedding Date</label>
          <input 
            type="date" 
            id="wedding_date" 
            name="wedding_date" 
            className="form-control" 
            value={profile.wedding_date} 
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="mb-3">
          <label htmlFor="bio" className="form-label">Bio</label>
          <textarea 
            id="bio" 
            name="bio" 
            className="form-control" 
            value={profile.bio} 
            onChange={handleChange} 
          />
        </div>
        <div className="mb-3">
          <label htmlFor="location" className="form-label">Location</label>
          <input 
            type="text" 
            id="location" 
            name="location" 
            className="form-control" 
            value={profile.location} 
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="mb-3">
          <label htmlFor="profile_picture" className="form-label">Profile Picture</label>
          <input 
            type="file" 
            id="profile_picture" 
            name="profile_picture" 
            className="form-control" 
            onChange={handleFileChange} 
          />
        </div>
        <div className="mb-3">
          <label htmlFor="bank_name" className="form-label">Bank Name</label>
          <input 
            type="text" 
            id="bank_name" 
            name="bank_name" 
            className="form-control" 
            value={profile.bank_name} 
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="mb-3">
          <label htmlFor="account_number" className="form-label">Account Number</label>
          <input 
            type="text" 
            id="account_number" 
            name="account_number" 
            className="form-control" 
            value={profile.account_number} 
            onChange={handleChange} 
            required 
          />
        </div>
        <div className="mb-3">
          <label htmlFor="revolut_username" className="form-label">Revolut Username</label>
          <input 
            type="text" 
            id="revolut_username" 
            name="revolut_username" 
            className="form-control" 
            value={profile.revolut_username} 
            onChange={handleChange} 
            required 
          />
        </div>
        <button type="submit" className="btn btn-primary">Save Profile</button>
      </form>
    </div>
  );
}

export default Profile;
