import axios from 'axios';

/** Must mirror auth.constants.ts on the backend. */
export const ACCESS_TOKEN_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_MS = 7 * 24 * 60 * 60 * 1000;
/** Refresh 3 minutes before the access token expires. */
export const ACCESS_REFRESH_LEAD_MS = 3 * 60 * 1000;

export const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<unknown> | null = null;
let lastRefreshAt = Date.now();
let onSessionExpired: (() => void) | null = null;

export function getLastRefreshAt() {
  return lastRefreshAt;
}

export function markSessionRefreshed() {
  lastRefreshAt = Date.now();
}

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post('/api/v1/auth/refresh', {}, { withCredentials: true })
      .then((res) => {
        markSessionRefreshed();
        return res;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/register') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        await refreshSession();
        return api(originalRequest);
      } catch (refreshError) {
        onSessionExpired?.();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);
