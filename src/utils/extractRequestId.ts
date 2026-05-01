import { isRecord } from './isRecord';

/** Header names checked in order for request correlation IDs. */
const CORRELATION_HEADERS = ['x-request-id', 'x-correlation-id'];

/**
 * Extract a request correlation ID from response headers.
 *
 * Headers are typically a `Record<string, unknown>` after axios normalises them.
 * Returns `undefined` when no known correlation header is present or when the
 * value is not a non-empty string.
 */
export function extractRequestId(headers: unknown): string | undefined {
  if (!isRecord(headers)) {return undefined;}

  for (const headerName of CORRELATION_HEADERS) {
    const value: unknown = headers[headerName];
    if (typeof value === 'string' && value.length > 0) {return value;}
  }
  return undefined;
}
