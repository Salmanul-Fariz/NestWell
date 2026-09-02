import type { CookieOptions, Request } from 'express';

/**
 * This app is served over HTTP (EC2). Browsers drop Secure cookies on HTTP,
 * so cookies stay non-secure unless COOKIE_SECURE is explicitly true.
 */
export function useSecureAuthCookies(): boolean {
  const override = process.env.COOKIE_SECURE?.toLowerCase();
  return override === 'true' || override === '1';
}

export function authCookieOptions(_req: Request, maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: useSecureAuthCookies(),
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

export function clearAuthCookieOptions(_req: Request): CookieOptions {
  return {
    httpOnly: true,
    secure: useSecureAuthCookies(),
    sameSite: 'lax',
    path: '/',
  };
}
