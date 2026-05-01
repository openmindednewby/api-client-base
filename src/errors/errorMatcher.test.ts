import { ErrorActionType } from './ErrorActionType';
import {
  matchError,
  matchesMethod,
  matchesPath,
  matchesRule,
  matchesStatus,
} from './errorMatcher';
import {
  PRIORITY_DEFAULT,
  PRIORITY_ROUTE_SPECIFIC,
  registerErrorRule,
  resetErrorRules,
} from './errorRegistry';
import { HttpMethod } from '../types/HttpMethod';

import type { ErrorRule } from './errorTypes';
import type { ClassifiedError } from '../types/ClassifiedError';

const NOW = 1700000000000;

function makeError(overrides: Partial<ClassifiedError> = {}): ClassifiedError {
  return {
    status: 500,
    url: '/api/x',
    method: HttpMethod.Get,
    message: 'oops',
    originalError: undefined,
    timestamp: NOW,
    ...overrides,
  };
}

describe('matchesStatus', () => {
  it('matches a single status', () => {
    expect(matchesStatus(404, 404)).toBe(true);
    expect(matchesStatus(404, 500)).toBe(false);
  });

  it('matches an array of statuses', () => {
    expect(matchesStatus(400, [400, 422])).toBe(true);
    expect(matchesStatus(401, [400, 422])).toBe(false);
  });

  it('matches a range', () => {
    expect(matchesStatus(503, { min: 500, max: 599 })).toBe(true);
    expect(matchesStatus(499, { min: 500, max: 599 })).toBe(false);
    expect(matchesStatus(599, { min: 500, max: 599 })).toBe(true);
  });

  it('returns false for invalid matcher shapes', () => {
    expect(matchesStatus(500, {} as never)).toBe(false);
  });

  it('returns false when matcher is a non-record primitive', () => {
    // exercises the !isRecord(value) branch inside isStatusRange
    expect(matchesStatus(500, 'oops' as unknown as number)).toBe(false);
  });
});

describe('matchesPath', () => {
  it('matches string substring', () => {
    expect(matchesPath('/api/users/123', '/users')).toBe(true);
    expect(matchesPath('/api/users/123', '/orders')).toBe(false);
  });

  it('matches regex', () => {
    expect(matchesPath('/api/users/123', /\/users\/\d+/)).toBe(true);
    expect(matchesPath('/api/users/abc', /\/users\/\d+/)).toBe(false);
  });
});

describe('matchesMethod', () => {
  it('matches a single method case-insensitively', () => {
    expect(matchesMethod(HttpMethod.Post, HttpMethod.Post)).toBe(true);
    expect(matchesMethod(HttpMethod.Get, HttpMethod.Post)).toBe(false);
  });

  it('matches an array of methods', () => {
    expect(matchesMethod(HttpMethod.Put, [HttpMethod.Put, HttpMethod.Patch])).toBe(true);
    expect(matchesMethod(HttpMethod.Get, [HttpMethod.Put, HttpMethod.Patch])).toBe(false);
  });
});

describe('matchesRule', () => {
  it('matches when all conditions satisfied', () => {
    const matcher = { status: 404, path: '/users', method: HttpMethod.Get, errorCode: 'NF' };
    const err = makeError({ status: 404, url: '/api/users', method: HttpMethod.Get, errorCode: 'NF' });
    expect(matchesRule(err, matcher)).toBe(true);
  });

  it('returns false when status mismatches', () => {
    expect(matchesRule(makeError({ status: 500 }), { status: 404 })).toBe(false);
  });

  it('returns false when path mismatches', () => {
    expect(matchesRule(makeError({ url: '/api/x' }), { path: '/y' })).toBe(false);
  });

  it('returns false when method mismatches', () => {
    expect(
      matchesRule(makeError({ method: HttpMethod.Get }), { method: HttpMethod.Post }),
    ).toBe(false);
  });

  it('returns false when errorCode mismatches', () => {
    expect(matchesRule(makeError({ errorCode: undefined }), { errorCode: 'X' })).toBe(false);
    expect(matchesRule(makeError({ errorCode: 'A' }), { errorCode: ['B', 'C'] })).toBe(false);
  });

  it('matches when errorCode in array', () => {
    expect(matchesRule(makeError({ errorCode: 'B' }), { errorCode: ['A', 'B'] })).toBe(true);
  });

  it('matches bodyField', () => {
    expect(
      matchesRule(makeError({ body: { kind: 'gated' } }), {
        bodyField: { key: 'kind', value: 'gated' },
      }),
    ).toBe(true);
  });

  it('returns false when bodyField mismatches', () => {
    expect(
      matchesRule(makeError({ body: { kind: 'other' } }), {
        bodyField: { key: 'kind', value: 'gated' },
      }),
    ).toBe(false);
    expect(
      matchesRule(makeError({ body: 'not-a-record' }), {
        bodyField: { key: 'kind', value: 'gated' },
      }),
    ).toBe(false);
  });

  it('matches empty matcher', () => {
    expect(matchesRule(makeError(), {})).toBe(true);
  });
});

describe('matchError', () => {
  beforeEach(() => resetErrorRules());
  afterEach(() => resetErrorRules());

  it('returns the highest-priority matching rule', () => {
    const rule: ErrorRule = {
      name: 'route-x',
      match: { path: '/api/x' },
      action: { type: ErrorActionType.Silent },
      priority: PRIORITY_ROUTE_SPECIFIC,
    };
    registerErrorRule(rule);
    const result = matchError(makeError({ url: '/api/x', status: 500 }));
    expect(result.matched).toBe(true);
    expect(result.rule?.name).toBe('route-x');
  });

  it('returns matched=false when nothing matches', () => {
    resetErrorRules();
    const result = matchError(makeError({ status: 200 }));
    expect(result.matched).toBe(false);
    expect(result.rule).toBeUndefined();
  });

  it('skips rules whose skipIf returns true', () => {
    const skipped: ErrorRule = {
      name: 'skipped',
      match: { status: 999 },
      action: { type: ErrorActionType.Silent },
      priority: PRIORITY_DEFAULT,
      skipIf: () => true,
    };
    registerErrorRule(skipped);
    const result = matchError(makeError({ status: 999 }));
    expect(result.matched).toBe(false);
  });
});
