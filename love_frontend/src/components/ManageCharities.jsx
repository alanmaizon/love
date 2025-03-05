// src/components/ManageCharities.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';

function ManageCharities() {
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch charities from the API
  useEffect(() => {
    const fetchCharities = async () => {
      try {
        const response = await axiosInstance.get('/charities/', { withCredentials: true });
        setCharities(response.data);
        setLoading(false);
      } catch (err) {
        setError('Error fetching charities.');
        setLoading(false);
      }
    };
    fetchCharities();
  }, []);

  return (
    <div className="container mt-5">
      <h2>Manage Charities</h2>
      {loading ? (
        <p>Loading charities...</p>
      ) : error ? (
        <p>{error}</p>
      ) : charities.length === 0 ? (
        <p>No charities available.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Website</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {charities.map((charity) => (
              <tr key={charity.id}>
                <td>{charity.name}</td>
                <td>{charity.description}</td>
                <td>
                  {charity.website ? (
                    <a href={charity.website} target="_blank" rel="noopener noreferrer">
                      {charity.website}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td>
                  <Link to={`/dashboard/charities/edit/${charity.id}`} className="btn btn-primary btn-sm">
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ManageCharities;
