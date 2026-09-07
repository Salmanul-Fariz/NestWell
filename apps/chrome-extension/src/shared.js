import { API_BASE_URL } from './config.js';

export const DEFAULT_API_BASE = API_BASE_URL;
export const ACCESS_TOKEN_KEY = 'accessToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';
export const USER_KEY = 'user';

export function normalizeOrigin(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.origin.toLowerCase();
  } catch {
    return null;
  }
}

export function getDomain(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function formatError(error, fallback = 'Something went wrong.') {
  return error?.message || fallback;
}
