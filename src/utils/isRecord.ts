/**
 * Type guard for plain object records.
 *
 * Returns true for non-null objects (excluding arrays at the call sites that
 * narrow further). Used internally by the package's error envelope helpers
 * so they accept arbitrary `unknown` payloads safely.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}
