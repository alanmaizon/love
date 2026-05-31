// src/api/axiosInstance.js
import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const axiosInstance = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptors
axiosInstance.interceptors.request.use(request => {
  console.log('Request:', request);
  return request;
});
axiosInstance.interceptors.response.use(response => {
  console.log('Response:', response);
  return response;
});

export default axiosInstance;
