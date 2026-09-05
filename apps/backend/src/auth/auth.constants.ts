import type { JwtSignOptions } from '@nestjs/jwt';

export const DEFAULT_ACCESS_TOKEN_TTL = '15m';
export const DEFAULT_REFRESH_TOKEN_TTL = '7d';
export type JwtDuration = Exclude<NonNullable<JwtSignOptions['expiresIn']>, number>;

/**
 * Converts the JWT duration format accepted by this app into milliseconds so
 * browser cookie expiry stays aligned with the token's `exp` claim.
 */
export function tokenTtlToMilliseconds(value: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d|w)$/i.exec(value.trim());
  if (!match) {
    throw new Error(
      `Invalid JWT expiry "${value}". Use a positive duration such as 15m, 1h, 7d, or 2w.`,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };
  const milliseconds = amount * multipliers[unit];

  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) {
    throw new Error(`JWT expiry "${value}" is outside the supported range.`);
  }

  return milliseconds;
}

/** Rotate refresh token on every refresh call to extend the 7d session */
export const REFRESH_ROTATE_AFTER_MS = 0;

/** A just-replaced refresh token stays usable for 5 minutes so concurrent and async network requests survive */
export const REFRESH_ROTATION_GRACE_MS = 5 * 60 * 1000;
