/**
 * Type definitions for the declarative error registry.
 *
 * The shapes here let consumers wire HTTP errors to UI actions (toast,
 * modal, redirect, silent, retry, custom) without writing imperative
 * branching logic in interceptors.
 */
import type { ErrorActionType } from './ErrorActionType';
import type { ErrorSeverity } from './ErrorSeverity';
import type { ClassifiedError } from '../types/ClassifiedError';
import type { HttpMethod } from '../types/HttpMethod';

/** Status match: a single code, array of codes, or a min/max range. */
export interface StatusRange {
  min: number;
  max: number;
}

/** Conditions to match against a classified error. All conditions are AND. */
export interface ErrorMatcher {
  /** HTTP status code, array of codes, or min/max range. */
  status?: number | number[] | StatusRange;
  /** URL path pattern (string substring) or RegExp. */
  path?: string | RegExp;
  /** HTTP method filter. */
  method?: HttpMethod | HttpMethod[];
  /** Match on API-specific error codes from response body. */
  errorCode?: string | string[];
  /** Match on a specific field in the error response body. */
  bodyField?: { key: string; value: unknown };
}

/** What to do when an error matches a rule. */
export interface ErrorAction {
  type: ErrorActionType;
  severity?: ErrorSeverity;
  /** Target path for redirect actions. */
  target?: string;
  /** Modal component name to render. */
  modalComponent?: string;
  /** Maximum retry count for retry actions. */
  maxRetries?: number;
  /** Handler function name for custom actions. */
  handler?: string;
  /** Whether to report this error to monitoring. */
  reportToMonitoring?: boolean;
  /** Whether to suppress error propagation to React Query. */
  suppressError?: boolean;
}

/** A single rule in the error registry. */
export interface ErrorRule {
  /** Human-readable name for debugging. */
  name: string;
  /** Conditions to match against the error. */
  match: ErrorMatcher;
  /** UI action to take when matched. */
  action: ErrorAction;
  /** i18n key for the user-facing message. */
  messageKey?: string;
  /** Fallback message if i18n key is not found. */
  fallbackMessage?: string;
  /** Priority (higher = checked first). Default 0. */
  priority?: number;
  /** Skip this rule if the predicate returns true. */
  skipIf?: (error: ClassifiedError) => boolean;
}

/** Result of matching an error against the registry. */
export interface ErrorMatchResult {
  matched: boolean;
  rule?: ErrorRule;
  error: ClassifiedError;
}
