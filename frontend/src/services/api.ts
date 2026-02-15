import axios from 'axios';

// In production use VITE_API_URL (e.g. https://prequaliq-production.up.railway.app); in dev use /api (Vite proxy)
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests dynamically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect to login for password reset endpoint - let it handle its own errors
    if (error.response?.status === 401 && !error.config?.url?.includes('/reset-password')) {
      // Token expired or invalid (but not for password reset)
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
