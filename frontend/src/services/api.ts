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
    // Don't redirect to login for password-change / forgot-password flows
    const url = error.config?.url || '';
    const skipAuthRedirect =
      url.includes('/reset-password') ||
      url.includes('/forgot-password') ||
      url.includes('/reset-password-with-token');
    if (error.response?.status === 401 && !skipAuthRedirect) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
