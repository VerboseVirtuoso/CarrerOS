import axios from 'axios';

// ─── Base URL ──────────────────────────────────────────────────────────────
// Reads from Vite env var, falls back to localhost for local dev.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// ─── Axios Instance ────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000, // 15-second timeout to avoid hanging requests
});

// ─── Request Interceptor — attach JWT ──────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // Debug logging in development
    if (import.meta.env.DEV) {
      console.log(`[API] ${config.method.toUpperCase()} ${config.url}`, config.data || '');
    }

    const token = localStorage.getItem('careeros-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — handle 401 globally ────────────────────────────
api.interceptors.response.use(
  // Pass successful responses straight through
  (response) => response,

  (error) => {
    if (error.response?.status === 401) {
      // Token missing, expired, or invalid — clear storage and redirect to login
      localStorage.removeItem('careeros-token');
      localStorage.removeItem('careeros-user');

      // Only redirect if we aren't already on the login page to avoid loops
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }

    // Normalise error shape so callers can always read error.message
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject(new Error(message));
  }
);

/**
 * Helper to unwrap standard { success: true, data: [...] } API envelopes.
 * Falls back to returning the raw payload if it's already an array or
 * doesn't match the expected success pattern.
 */
export const extractData = (res) => {
  const p = res.data;
  if (Array.isArray(p)) return p;
  if (Array.isArray(p?.data)) return p.data;
  if (p?.data !== undefined) return p.data;
  return p;
};

export default api;
