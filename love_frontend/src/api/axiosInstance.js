// src/api/axiosInstance.js
import axios from 'axios';

const configured = import.meta.env.VITE_API_URL;
let apiRoot;
if (configured && configured !== '') {
  apiRoot = `${configured.replace(/\/$/, '')}/api`;
} else if (import.meta.env.DEV) {
  apiRoot = '/api';
} else {
  apiRoot = 'http://127.0.0.1:8000/api';
}

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

const axiosInstance = axios.create({
  baseURL: apiRoot,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    config.headers['X-CSRFToken'] = getCsrfToken();
  }
  return config;
});

export default axiosInstance;
