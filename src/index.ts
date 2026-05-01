/**
 * `@dloizides/api-client-base` — realm-agnostic, product-agnostic HTTP plumbing.
 *
 * Designed for the dloizides.com portfolio split (Questioner ⇄ OnlineMenu and
 * future products): every consumer supplies its own `baseUrl` and pairs the
 * client with `@dloizides/auth-client` via the `getAccessToken` callback. This
 * package never imports `auth-client` and never references a specific product,
 * realm, or hardcoded URL.
 *
 * Surface:
 *   • `ApiClient` — fetch-based client, throws `ApiError` on non-2xx
 *   • `ApiError` / `ApiErrorEnvelope` — uniform error shape
 *   • `apiEventBus` / `ApiEventBus` — typed pub/sub bridging interceptors to UI
 *   • Error registry / matcher / classifier — declarative HTTP-error → action
 *   • Pure helpers — extractErrorCode, extractErrorMessage, extractRequestId
 */

// --- Core client ---
export { ApiClient } from './ApiClient';
export type { ApiRequestOptions } from './ApiClient';

// --- Types ---
export type { ApiClientConfig } from './types/ApiClientConfig';
export type { ApiErrorEnvelope } from './types/ApiErrorEnvelope';
export type { ClassifiedError } from './types/ClassifiedError';
export { ApiError } from './types/ApiError';
export { HttpMethod } from './types/HttpMethod';

// --- Events ---
export { ApiEventBus, apiEventBus } from './events/apiEventBus';
export type { ApiEventListener } from './events/apiEventBus';
export type {
  ApiEvent,
  ApiEventType,
  MaintenanceModeEvent,
  ModalEvent,
  RedirectEvent,
  SessionExpiredEvent,
  ToastEvent,
} from './events/apiEventTypes';

// --- Errors ---
export { ErrorActionType } from './errors/ErrorActionType';
export { ErrorSeverity } from './errors/ErrorSeverity';
export type {
  ErrorAction,
  ErrorMatcher,
  ErrorMatchResult,
  ErrorRule,
  StatusRange,
} from './errors/errorTypes';
export {
  DEFAULT_ERROR_RULES,
  PRIORITY_DEFAULT,
  PRIORITY_FEATURE_GATED,
  PRIORITY_MAINTENANCE,
  PRIORITY_ROUTE_SPECIFIC,
  getErrorRules,
  isAuthEndpoint,
  registerErrorRule,
  resetErrorRules,
  resetLoginRedirectPath,
  setLoginRedirectPath,
} from './errors/errorRegistry';
export {
  matchError,
  matchesMethod,
  matchesPath,
  matchesRule,
  matchesStatus,
} from './errors/errorMatcher';
export { classifyAxiosError } from './errors/classifyAxiosError';
export type { AxiosErrorLike } from './errors/classifyAxiosError';

// --- Pure helpers ---
export { extractErrorCode } from './utils/extractErrorCode';
export { extractErrorMessage } from './utils/extractErrorMessage';
export { extractRequestId } from './utils/extractRequestId';
export { isRecord } from './utils/isRecord';
