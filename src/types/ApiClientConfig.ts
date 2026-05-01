/**
 * Configuration for {@link ApiClient}. Realm-agnostic and product-agnostic:
 * never references a specific product, realm, or hardcoded URL.
 *
 * Pairs with `@dloizides/auth-client` via the `getAccessToken` callback —
 * we deliberately do NOT import `auth-client` from this package so the two
 * stay composable, not coupled.
 */
export interface ApiClientConfig {
  /** Base URL for every request, e.g. `https://api.questioner.com`. */
  baseUrl: string;
  /** Default headers merged into every request (e.g. tenant ID). */
  defaultHeaders?: Record<string, string>;
  /** Per-request timeout in milliseconds. Default: 15000. */
  timeoutMs?: number;
  /**
   * Optional callback invoked per request to obtain the bearer token.
   * Returning `null` skips the Authorization header.
   */
  getAccessToken?: () => string | null | Promise<string | null>;
}
