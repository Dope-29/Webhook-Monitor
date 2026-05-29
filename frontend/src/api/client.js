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

// Global 401 handler — auto-logout on expired token
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
