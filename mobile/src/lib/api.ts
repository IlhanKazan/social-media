import axios from 'axios';

import { useAuthStore } from '@/stores/auth-store';

const baseURL = process.env.EXPO_PUBLIC_API_URL;

if (!baseURL) {
  throw new Error('EXPO_PUBLIC_API_URL is not set. Copy .env.example to .env and fill it in.');
}

export const api = axios.create({
  baseURL: `${baseURL}/api/v1`,
  // Render free tier cold starts can take 30-60s; match the web client's ceiling.
  timeout: 30_000,
  headers: { 'X-Client-Platform': 'mobile' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // A 401 from an auth endpoint (login, mfa/verify, ...) is a credential/code error,
    // not an expired session — let the caller handle it instead of refreshing.
    const isAuthEndpoint = (originalRequest?.url ?? '').includes('/auth/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      const refreshed = await useAuthStore.getState().tryRefresh();
      if (refreshed) {
        const newToken = useAuthStore.getState().token;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
      // Not refreshed: the store is cleared; the auth gate redirects to login.
    }
    return Promise.reject(error);
  }
);
