export function normalizeBackendDateTimeToUtcIso(input: string): string {
  const raw = (input || '').trim();
  if (!raw) return raw;

  if (/(?:Z|[+-]\d{2}:\d{2})$/.test(raw)) return raw;

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

export function localDateAndTimeToUtcIso(date: string, time: string): string {
  const d = (date || '').trim();
  const t = (time || '').trim();
  const local = new Date(`${d}T${t}`);
  if (Number.isNaN(local.getTime())) {
    throw new Error('Invalid local date/time');
  }
  return local.toISOString();
}

