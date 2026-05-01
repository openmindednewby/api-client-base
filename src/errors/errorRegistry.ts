/**
 * Declarative error-to-action mapping table.
 *
 * The registry is the routing table that maps HTTP error conditions to UI
 * actions. Rules are matched in priority order (highest first); first match
 * wins. Consumers can override the defaults by calling `resetErrorRules()`
 * after `registerErrorRule()` for app-specific rules.
 *
 * The defaults emitted here are realm-agnostic — message keys are i18n
 * keys consumers must provide in their translation bundles. The login
 * redirect target is configurable via `setLoginRedirectPath()`.
 */
import { ErrorActionType } from './ErrorActionType';
import { ErrorSeverity } from './ErrorSeverity';

import type { ErrorRule } from './errorTypes';
import type { ClassifiedError } from '../types/ClassifiedError';

/** Priority levels (higher = checked first). */
export const PRIORITY_ROUTE_SPECIFIC = 20;
export const PRIORITY_FEATURE_GATED = 10;
export const PRIORITY_MAINTENANCE = 5;
export const PRIORITY_DEFAULT = 0;

/** Auth endpoint substrings; session-expired rule skips these. */
const AUTH_PATTERNS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/verify-otp',
  '/protocol/openid-connect/token',
];

/** Default login redirect path, overrideable via {@link setLoginRedirectPath}. */
const DEFAULT_LOGIN_PATH = '/login';
let loginRedirectPath = DEFAULT_LOGIN_PATH;

/** Error code for connection abort / timeout. */
const ERROR_CODE_TIMEOUT = 'ECONNABORTED';
/** Error code for feature gating. */
const ERROR_CODE_FEATURE_GATED = 'FEATURE_GATED';

/** HTTP status codes referenced by the default rules. */
const STATUS_UNAUTHORIZED = 401;
const STATUS_PAYMENT_REQUIRED = 402;
const STATUS_FORBIDDEN = 403;
const STATUS_BAD_REQUEST = 400;
const STATUS_UNPROCESSABLE = 422;
const STATUS_CONFLICT = 409;
const STATUS_TOO_MANY_REQUESTS = 429;
const STATUS_SERVER_ERROR_MIN = 500;
const STATUS_SERVER_ERROR_MAX = 599;
const STATUS_BAD_GATEWAY = 502;
const STATUS_SERVICE_UNAVAILABLE = 503;
const STATUS_GATEWAY_TIMEOUT = 504;
const STATUS_NETWORK_ERROR = 0;

/** True if the URL contains a known auth-flow segment. */
export function isAuthEndpoint(url: string): boolean {
  return AUTH_PATTERNS.some((pattern) => url.includes(pattern));
}

/** Override the redirect target used by the `session-expired` default rule. */
export function setLoginRedirectPath(path: string): void {
  loginRedirectPath = path;
}

/** Reset the redirect path to its default. Useful for tests. */
export function resetLoginRedirectPath(): void {
  loginRedirectPath = DEFAULT_LOGIN_PATH;
}

/**
 * Build the default rule set. We use a function so consumers calling
 * `setLoginRedirectPath()` after import still get the correct target on
 * subsequent `resetErrorRules()` calls.
 */
function buildDefaultRules(): ErrorRule[] {
  return [
    {
      name: 'feature-gated',
      match: { status: STATUS_FORBIDDEN, errorCode: ERROR_CODE_FEATURE_GATED },
      action: {
        type: ErrorActionType.Modal,
        severity: ErrorSeverity.Info,
        modalComponent: 'FeatureGateModal',
      },
      messageKey: 'errors.featureNotAvailable',
      priority: PRIORITY_FEATURE_GATED,
    },
    {
      name: 'maintenance-mode',
      match: { status: STATUS_SERVICE_UNAVAILABLE },
      action: {
        type: ErrorActionType.Modal,
        severity: ErrorSeverity.Warning,
        modalComponent: 'MaintenanceModal',
      },
      messageKey: 'errors.maintenance',
      priority: PRIORITY_MAINTENANCE,
    },
    {
      name: 'session-expired',
      match: { status: STATUS_UNAUTHORIZED },
      action: {
        type: ErrorActionType.Redirect,
        target: loginRedirectPath,
        suppressError: true,
      },
      messageKey: 'errors.sessionExpired',
      priority: PRIORITY_DEFAULT,
      skipIf: (error: ClassifiedError) => isAuthEndpoint(error.url),
    },
    {
      name: 'forbidden',
      match: { status: STATUS_FORBIDDEN },
      action: { type: ErrorActionType.Toast, severity: ErrorSeverity.Error },
      messageKey: 'errors.forbidden',
      priority: PRIORITY_DEFAULT,
    },
    {
      name: 'subscription-required',
      match: { status: STATUS_PAYMENT_REQUIRED },
      action: {
        type: ErrorActionType.Modal,
        severity: ErrorSeverity.Warning,
        modalComponent: 'UpgradePrompt',
      },
      messageKey: 'errors.subscriptionRequired',
      priority: PRIORITY_DEFAULT,
    },
    {
      name: 'validation-error',
      match: { status: [STATUS_BAD_REQUEST, STATUS_UNPROCESSABLE] },
      action: { type: ErrorActionType.Toast, severity: ErrorSeverity.Warning },
      messageKey: 'errors.validationFailed',
      priority: PRIORITY_DEFAULT,
    },
    {
      name: 'conflict',
      match: { status: STATUS_CONFLICT },
      action: { type: ErrorActionType.Toast, severity: ErrorSeverity.Warning },
      messageKey: 'errors.conflict',
      priority: PRIORITY_DEFAULT,
    },
    {
      name: 'rate-limited',
      match: { status: STATUS_TOO_MANY_REQUESTS },
      action: { type: ErrorActionType.Toast, severity: ErrorSeverity.Warning },
      messageKey: 'errors.tooManyRequests',
      priority: PRIORITY_DEFAULT,
    },
    {
      name: 'bad-gateway',
      match: { status: [STATUS_BAD_GATEWAY, STATUS_GATEWAY_TIMEOUT] },
      action: { type: ErrorActionType.Toast, severity: ErrorSeverity.Error },
      messageKey: 'errors.badGateway',
      priority: PRIORITY_DEFAULT,
    },
    {
      name: 'server-error',
      match: { status: { min: STATUS_SERVER_ERROR_MIN, max: STATUS_SERVER_ERROR_MAX } },
      action: {
        type: ErrorActionType.Toast,
        severity: ErrorSeverity.Error,
        reportToMonitoring: true,
      },
      messageKey: 'errors.serverError',
      priority: PRIORITY_DEFAULT,
    },
    {
      name: 'network-offline',
      match: { status: STATUS_NETWORK_ERROR },
      action: { type: ErrorActionType.Toast, severity: ErrorSeverity.Warning },
      messageKey: 'errors.networkOffline',
      priority: PRIORITY_DEFAULT,
    },
    {
      name: 'request-timeout',
      match: { errorCode: ERROR_CODE_TIMEOUT },
      action: { type: ErrorActionType.Toast, severity: ErrorSeverity.Warning },
      messageKey: 'errors.requestTimeout',
      priority: PRIORITY_DEFAULT,
    },
  ];
}

/** Frozen snapshot of the built-in defaults at module load time. */
export const DEFAULT_ERROR_RULES: readonly ErrorRule[] = buildDefaultRules();

function sortByPriority(rules: ErrorRule[]): ErrorRule[] {
  return rules.sort(
    (a, b) => (b.priority ?? PRIORITY_DEFAULT) - (a.priority ?? PRIORITY_DEFAULT),
  );
}

/** Internal mutable copy, sorted by priority descending. */
let sortedRules: ErrorRule[] = sortByPriority([...DEFAULT_ERROR_RULES]);

/** Returns the current rules, sorted by priority (highest first). */
export function getErrorRules(): readonly ErrorRule[] {
  return sortedRules;
}

/** Register a new error rule at runtime; rules are re-sorted by priority. */
export function registerErrorRule(rule: ErrorRule): void {
  sortedRules = sortByPriority([...sortedRules, rule]);
}

/** Reset the registry to the default rules. Primarily for tests. */
export function resetErrorRules(): void {
  sortedRules = sortByPriority([...buildDefaultRules()]);
}
