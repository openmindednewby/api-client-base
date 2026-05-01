import type { ApiErrorEnvelope } from './ApiErrorEnvelope';

/**
 * Thrown by {@link ApiClient.request} on non-2xx responses and network errors.
 *
 * Carries the normalised {@link ApiErrorEnvelope} so callers can branch on
 * `status` / `code` without touching the raw response.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(envelope: ApiErrorEnvelope) {
    super(envelope.message);
    this.name = 'ApiError';
    this.status = envelope.status;
    this.code = envelope.code;
    this.details = envelope.details;
    // Preserve prototype chain for `instanceof ApiError` after transpilation.
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}
