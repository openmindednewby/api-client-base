/**
 * Error matching engine.
 *
 * Walks the registry in priority order and returns the first rule whose
 * matcher fields all evaluate true (AND logic). Unspecified matcher fields
 * are ignored.
 */
import { getErrorRules } from './errorRegistry';
import { isRecord } from '../utils/isRecord';

import type {
  ErrorMatcher,
  ErrorMatchResult,
  ErrorRule,
  StatusRange,
} from './errorTypes';
import type { ClassifiedError } from '../types/ClassifiedError';
import type { HttpMethod } from '../types/HttpMethod';

function isStatusRange(value: unknown): value is StatusRange {
  if (!isRecord(value)) {return false;}
  return 'min' in value && 'max' in value;
}

export function matchesStatus(
  errorStatus: number,
  matcherStatus: number | number[] | StatusRange,
): boolean {
  if (typeof matcherStatus === 'number') {return errorStatus === matcherStatus;}
  if (Array.isArray(matcherStatus)) {return matcherStatus.includes(errorStatus);}
  if (isStatusRange(matcherStatus)) {
    return errorStatus >= matcherStatus.min && errorStatus <= matcherStatus.max;
  }
  return false;
}

export function matchesPath(errorUrl: string, matcherPath: string | RegExp): boolean {
  if (typeof matcherPath === 'string') {return errorUrl.includes(matcherPath);}
  return matcherPath.test(errorUrl);
}

export function matchesMethod(
  errorMethod: HttpMethod,
  matcherMethod: HttpMethod | HttpMethod[],
): boolean {
  const normalised = String(errorMethod).toUpperCase();
  if (typeof matcherMethod === 'string') {
    return normalised === matcherMethod.toUpperCase();
  }
  return matcherMethod.some((m) => normalised === String(m).toUpperCase());
}

function matchesErrorCode(
  errorCode: string | undefined,
  matcherCode: string | string[],
): boolean {
  if (errorCode === undefined) {return false;}
  if (typeof matcherCode === 'string') {return errorCode === matcherCode;}
  return matcherCode.includes(errorCode);
}

function matchesBodyField(body: unknown, field: { key: string; value: unknown }): boolean {
  if (!isRecord(body)) {return false;}
  const actual: unknown = body[field.key];
  return JSON.stringify(actual) === JSON.stringify(field.value);
}

/**
 * Check if a classified error satisfies all conditions in a matcher.
 */
export function matchesRule(error: ClassifiedError, matcher: ErrorMatcher): boolean {
  if (matcher.status !== undefined && !matchesStatus(error.status, matcher.status)) {
    return false;
  }
  if (matcher.path !== undefined && !matchesPath(error.url, matcher.path)) {
    return false;
  }
  if (matcher.method !== undefined && !matchesMethod(error.method, matcher.method)) {
    return false;
  }
  if (matcher.errorCode !== undefined && !matchesErrorCode(error.errorCode, matcher.errorCode)) {
    return false;
  }
  if (matcher.bodyField !== undefined && !matchesBodyField(error.body, matcher.bodyField)) {
    return false;
  }
  return true;
}

/**
 * Match a classified error against the registry. Rules are checked in
 * priority order; the first matching rule wins.
 */
export function matchError(error: ClassifiedError): ErrorMatchResult {
  const rules: readonly ErrorRule[] = getErrorRules();
  for (const rule of rules) {
    if (rule.skipIf !== undefined && rule.skipIf(error)) {continue;}
    if (matchesRule(error, rule.match)) {return { matched: true, rule, error };}
  }
  return { matched: false, error };
}
