// src/api/axiosInstance.js
import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  withCredentials: true,
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
