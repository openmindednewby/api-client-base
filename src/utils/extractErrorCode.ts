import { isRecord } from './isRecord';

/**
 * Extract a stable error code from a backend error response body.
 *
 * Tries the conventional FastEndpoints / ProblemDetails-style fields in order:
 * - `errorCode` (preferred dloizides convention)
 * - `code`
 * - `error` (when it's a string code rather than a message)
 *
 * Returns `undefined` if none of those fields are present, non-string, or empty.
 */
export function extractErrorCode(data: unknown): string | undefined {
  if (!isRecord(data)) {return undefined;}

  if (typeof data.errorCode === 'string' && data.errorCode.length > 0) {
    return data.errorCode;
  }
  if (typeof data.code === 'string' && data.code.length > 0) {
    return data.code;
  }
  if (typeof data.error === 'string' && data.error.length > 0) {
    return data.error;
  }
  return undefined;
}
