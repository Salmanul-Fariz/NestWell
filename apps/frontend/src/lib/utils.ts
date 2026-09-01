import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Local calendar date as YYYY-MM-DD (not UTC, so it does not shift near midnight). */
export function todayDateOnly(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Date-only YYYY-MM-DD → ISO 8601 UTC midnight for class-validator @IsDateString. */
export function toIsoUtcDate(dateOnly: string): string {
  return `${dateOnly}T00:00:00.000Z`;
}

export function toDateOnly(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function formatDateOnly(iso?: string | null): string {
  if (!iso) return '';
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return '';
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.filter(Boolean).join(', ');
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}
