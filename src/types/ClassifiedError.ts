import type { HttpMethod } from './HttpMethod';

/**
 * A classified HTTP error with all context extracted into a stable shape,
 * decoupled from any specific HTTP library.
 *
 * Produced by `classifyAxiosError` (or any future fetch-based classifier).
 * Consumed by `matchError`, `executeErrorAction`, and monitoring reporters.
 */
export interface ClassifiedError {
  /** HTTP status code (0 for network errors). */
  status: number;
  /** Request URL. */
  url: string;
  /** Request HTTP method. */
  method: HttpMethod;
  /** API-specific error code from the response body. */
  errorCode?: string;
  /** Extracted error message. */
  message: string;
  /** Raw response body. */
  body?: unknown;
  /** Original error reference (e.g. AxiosError). */
  originalError: unknown;
  /** Timestamp when the error occurred. */
  timestamp: number;
  /** Correlation ID extracted from response headers, if any. */
  requestId?: string;
}
