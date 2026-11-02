import axios, { type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { beginGlobalBusy, endGlobalBusy } from '../lib/globalBusy';

// In production use VITE_API_URL (e.g. https://prequaliq-production.up.railway.app); in dev use /api (Vite proxy)
const baseURL = import.meta.env.VITE_API_URL || '/api';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** Skip the global processing overlay (polling / background refresh). */
    silentBusy?: boolean;
  }
}

type BusyConfig = InternalAxiosRequestConfig & {
  silentBusy?: boolean;
  __busyTracked?: boolean;
};

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

function shouldTrackBusy(config?: AxiosRequestConfig | null) {
  if (!config) return false;
  if (config.silentBusy) return false;
  const url = String(config.url || '');
  // Background / high-frequency endpoints — do not flash the overlay
  if (url.includes('/notifications/preview')) return false;
  if (url.includes('/health')) return false;
  return true;
}

function releaseBusy(config?: BusyConfig | null) {
  if (config?.__busyTracked) {
    config.__busyTracked = false;
    endGlobalBusy();
  }
}

// Add token + start global busy tracker
api.interceptors.request.use(
  (config: BusyConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (shouldTrackBusy(config)) {
      config.__busyTracked = true;
      beginGlobalBusy();
    }
    return config;
  },
  (error) => {
    releaseBusy(error.config as BusyConfig | undefined);
    return Promise.reject(error);
  }
);

// Clear busy + handle auth errors
api.interceptors.response.use(
  (response) => {
    releaseBusy(response.config as BusyConfig);
    return response;
  },
  (error) => {
    releaseBusy(error.config as BusyConfig | undefined);
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
