// src/components/ExploreCharities.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function ExploreCharities() {
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('http://localhost:8000/api/charities/', { withCredentials: true })
      .then(response => {
        setCharities(response.data);
        setLoading(false);
      })
      .catch(err => {
        setError('Error fetching charities.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="container mt-5">
      <h2>Explore Charities</h2>
      {loading ? (
        <p>Loading charities...</p>
      ) : error ? (
        <p>{error}</p>
      ) : charities.length === 0 ? (
        <p>No charities found.</p>
      ) : (
        <div className="row">
          {charities.map(charity => (
            <div key={charity.id} className="col-md-4 mb-4">
              <div className="card h-100">
                {charity.logo && (
                  <img
                    src={charity.logo}
                    className="card-img-top"
                    alt={charity.name}
                  />
                )}
                <div className="card-body">
                  <h5 className="card-title">{charity.name}</h5>
                  <p className="card-text">{charity.description}</p>
                  {charity.website && (
                    <p>
                      <a
                        href={charity.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Visit Website
                      </a>
                    </p>
                  )}
                </div>
                <div className="card-footer">
                  <Link
                    to="/donate"
                    state={{ selectedCharity: charity.id }}
                    className="btn btn-primary"
                  >
                    Donate to {charity.name}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ExploreCharities;
