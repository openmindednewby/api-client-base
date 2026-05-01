import { isRecord } from './isRecord';

/**
 * Extract a human-readable error message from a backend error response body.
 *
 * Tries conventional fields in order: `message` -> `detail` -> `error` -> `title`.
 * `error` is checked because some legacy responses use it for the message rather
 * than a code; `extractErrorCode` and `extractErrorMessage` may both pick it up
 * and that's fine — the consumer decides which to display.
 *
 * Returns `fallback` if none of those fields yield a non-empty string.
 */
export function extractErrorMessage(data: unknown, fallback: string): string {
  if (!isRecord(data)) {return fallback;}

  if (typeof data.message === 'string' && data.message.length > 0) {
    return data.message;
  }
  if (typeof data.detail === 'string' && data.detail.length > 0) {
    return data.detail;
  }
  if (typeof data.error === 'string' && data.error.length > 0) {
    return data.error;
  }
  if (typeof data.title === 'string' && data.title.length > 0) {
    return data.title;
  }
  return fallback;
}
