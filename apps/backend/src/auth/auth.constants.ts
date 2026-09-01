/**
 * Access token: 15 minutes (short-lived access)
 * Refresh token: 7 days (long-lived session sliding window)
 */
export const ACCESS_TOKEN_TTL = '15m';
export const REFRESH_TOKEN_TTL = '7d';

export const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Rotate refresh token on every refresh call to extend the 7d session */
export const REFRESH_ROTATE_AFTER_MS = 0;

/** A just-replaced refresh token stays usable for 5 minutes so concurrent and async network requests survive */
export const REFRESH_ROTATION_GRACE_MS = 5 * 60 * 1000;
