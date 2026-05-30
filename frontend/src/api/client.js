import axios from 'axios';
import useAuthStore from '../store/authStore';

const client = axios.create({
  baseURL: '',   // Vite proxy forwards /api → http://localhost:5000
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every protected request
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response handler — auto-logout on 401, retry once on network error
client.interceptors.response.use(
  (res) => res,
  async (err) => {
    // Auto-logout on expired / invalid token
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(err);
    }

    // Retry once on network error (no response received)
    const config = err.config;
    if (!err.response && !config._retried) {
      config._retried = true;
      await new Promise((r) => setTimeout(r, 500));
      return client(config);
    }

    return Promise.reject(err);
  }
);

export default client;
