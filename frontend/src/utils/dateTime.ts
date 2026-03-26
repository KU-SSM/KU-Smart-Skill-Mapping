/**
 * Backend often returns timezone-naive datetimes (no `Z` / offset).
 * Treat those as UTC to avoid Thailand-local parsing shifting times.
 */
export function normalizeBackendDateTimeToUtcIso(input: string): string {
  const raw = (input || '').trim();
  if (!raw) return raw;

  // If it already contains a timezone, keep as-is.
  if (/(?:Z|[+-]\d{2}:\d{2})$/.test(raw)) return raw;

  // Common backend shapes:
  // - "2026-03-26 23:59:59"
  // - "2026-03-26T23:59:59"
  if (raw.includes(' ')) {
    return `${raw.replace(' ', 'T')}Z`;
  }
  if (raw.includes('T')) {
    return `${raw}Z`;
  }
  return raw;
}

export function parseBackendDateTimeAsUtc(input: string): Date {
  const iso = normalizeBackendDateTimeToUtcIso(input);
  return new Date(iso);
}

/**
 * Convert a user-picked local (Thailand) date+time into UTC ISO ("...Z") string.
 * This avoids the backend treating naive datetimes as UTC incorrectly.
 */
export function localDateAndTimeToUtcIso(date: string, time: string): string {
  const d = (date || '').trim();
  const t = (time || '').trim();
  const local = new Date(`${d}T${t}`);
  if (Number.isNaN(local.getTime())) {
    throw new Error('Invalid local date/time');
  }
  return local.toISOString();
}

