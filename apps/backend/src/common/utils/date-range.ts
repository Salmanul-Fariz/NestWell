/**
 * Dates are stored as UTC midnight (see the frontend's toIsoUtcDate helper), so every
 * range here is built in UTC. Using local time would shift entries into the wrong month
 * for anyone east or west of UTC.
 */

export interface DateRange {
  start: Date;
  end: Date;
}

export function utcMonthRange(year: number, month: number): DateRange {
  return {
    start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

export function utcYearRange(year: number): DateRange {
  return {
    start: new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999)),
  };
}

export function parseMonth(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 12 ? parsed : undefined;
}

export function parseYear(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 2000 && parsed <= 2100 ? parsed : undefined;
}

/**
 * Builds a `date` filter from optional month/year query params.
 * Year alone filters the whole year; neither means "no date filter at all".
 */
export function buildDateFilter(
  month: string | undefined,
  year: string | undefined,
): { $gte: Date; $lte: Date } | undefined {
  const parsedMonth = parseMonth(month);
  const parsedYear = parseYear(year);

  if (parsedYear === undefined) return undefined;

  const range =
    parsedMonth === undefined
      ? utcYearRange(parsedYear)
      : utcMonthRange(parsedYear, parsedMonth);

  return { $gte: range.start, $lte: range.end };
}
