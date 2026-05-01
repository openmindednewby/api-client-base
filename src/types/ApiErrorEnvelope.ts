/**
 * Normalised shape of a backend error response.
 *
 * Backend services in the portfolio (FastEndpoints / ProblemDetails) emit
 * varied JSON envelopes. The package's helpers extract a consistent shape:
 * status, optional code, message, and arbitrary detail payload.
 */
export interface ApiErrorEnvelope {
  /** HTTP status code (0 for network/timeout errors). */
  status: number;
  /** Application-level error code (e.g. `FEATURE_GATED`). */
  code?: string;
  /** Human-readable message. */
  message: string;
  /** Raw response body or extra context. */
  details?: unknown;
}
