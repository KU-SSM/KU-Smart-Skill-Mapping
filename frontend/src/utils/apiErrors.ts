import axios from 'axios';

/** Prefer FastAPI `detail` (string or validation array) over generic axios text. */
export function getApiErrorDetail(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data != null && typeof data === 'object' && 'detail' in data) {
      const detail = (data as { detail: unknown }).detail;
      if (typeof detail === 'string') return detail;
      if (Array.isArray(detail)) {
        return detail
          .map((item: unknown) => {
            if (item && typeof item === 'object' && 'msg' in item) {
              return String((item as { msg: unknown }).msg);
            }
            return JSON.stringify(item);
          })
          .join('; ');
      }
    }
    if (typeof data === 'string' && data.trim()) return data;
    if (error.response?.status) {
      return `Request failed (${error.response.status}). ${error.message}`;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
