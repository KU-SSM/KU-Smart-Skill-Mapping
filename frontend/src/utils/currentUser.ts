/**
 * Until login persists a user id, use localStorage or env default (dev).
 */
const STORAGE_KEY = 'ssm_user_id';

export function getCurrentUserId(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw != null && raw !== '') {
      const n = Number(raw);
      if (Number.isInteger(n) && n > 0) return n;
    }
  } catch {
    /* ignore */
  }
  const env = process.env.REACT_APP_DEFAULT_USER_ID;
  if (env != null && env !== '') {
    const n = Number(env);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return 1;
}

export function setCurrentUserId(userId: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(userId));
  } catch {
    /* ignore */
  }
}
