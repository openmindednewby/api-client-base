import { ErrorActionType } from './ErrorActionType';
import {
  DEFAULT_ERROR_RULES,
  getErrorRules,
  isAuthEndpoint,
  PRIORITY_DEFAULT,
  PRIORITY_FEATURE_GATED,
  PRIORITY_MAINTENANCE,
  PRIORITY_ROUTE_SPECIFIC,
  registerErrorRule,
  resetErrorRules,
  resetLoginRedirectPath,
  setLoginRedirectPath,
} from './errorRegistry';

import type { ErrorRule } from './errorTypes';

describe('errorRegistry', () => {
  afterEach(() => {
    resetErrorRules();
    resetLoginRedirectPath();
  });

  describe('isAuthEndpoint', () => {
    it('matches known auth segments', () => {
      expect(isAuthEndpoint('https://x/api/auth/login')).toBe(true);
      expect(isAuthEndpoint('/auth/refresh')).toBe(true);
      expect(isAuthEndpoint('/auth/verify-otp')).toBe(true);
      expect(isAuthEndpoint('/realms/x/protocol/openid-connect/token')).toBe(true);
    });

    it('returns false for non-auth URLs', () => {
      expect(isAuthEndpoint('/api/users')).toBe(false);
      expect(isAuthEndpoint('')).toBe(false);
    });
  });

  describe('priority constants', () => {
    it('keeps the documented ordering', () => {
      expect(PRIORITY_ROUTE_SPECIFIC).toBeGreaterThan(PRIORITY_FEATURE_GATED);
      expect(PRIORITY_FEATURE_GATED).toBeGreaterThan(PRIORITY_MAINTENANCE);
      expect(PRIORITY_MAINTENANCE).toBeGreaterThan(PRIORITY_DEFAULT);
    });
  });

  describe('DEFAULT_ERROR_RULES', () => {
    it('contains the expected rule names', () => {
      const names = DEFAULT_ERROR_RULES.map((r) => r.name);
      expect(names).toEqual(
        expect.arrayContaining([
          'feature-gated',
          'maintenance-mode',
          'session-expired',
          'forbidden',
          'subscription-required',
          'validation-error',
          'conflict',
          'rate-limited',
          'bad-gateway',
          'server-error',
          'network-offline',
          'request-timeout',
        ]),
      );
    });

    it('marks server-error with reportToMonitoring', () => {
      const rule = DEFAULT_ERROR_RULES.find((r) => r.name === 'server-error');
      expect(rule?.action.reportToMonitoring).toBe(true);
    });

    it('skips session-expired for auth endpoints', () => {
      const rule = DEFAULT_ERROR_RULES.find((r) => r.name === 'session-expired');
      expect(
        rule?.skipIf?.({
          status: 401,
          url: '/api/auth/login',
          method: 'GET' as never,
          message: '',
          originalError: undefined,
          timestamp: 0,
        }),
      ).toBe(true);
    });
  });

  describe('getErrorRules', () => {
    it('returns rules sorted by priority descending', () => {
      const rules = getErrorRules();
      const priorities = rules.map((r) => r.priority ?? PRIORITY_DEFAULT);
      const sorted = [...priorities].sort((a, b) => b - a);
      expect(priorities).toEqual(sorted);
    });
  });

  describe('registerErrorRule', () => {
    it('adds a new rule and re-sorts by priority', () => {
      const high: ErrorRule = {
        name: 'route-x',
        match: { path: '/x' },
        action: { type: ErrorActionType.Silent },
        priority: PRIORITY_ROUTE_SPECIFIC,
      };
      registerErrorRule(high);
      const rules = getErrorRules();
      expect(rules[0]?.name).toBe('route-x');
    });

    it('treats missing priority as PRIORITY_DEFAULT during sort', () => {
      // Exercises both `?? PRIORITY_DEFAULT` branches in the sort comparator
      // (both `a.priority` and `b.priority` undefined when comparing the two
      // newly-registered rules against each other).
      const noPriorityA: ErrorRule = {
        name: 'no-priority-a',
        match: { status: 418 },
        action: { type: ErrorActionType.Silent },
      };
      const noPriorityB: ErrorRule = {
        name: 'no-priority-b',
        match: { status: 419 },
        action: { type: ErrorActionType.Silent },
      };
      registerErrorRule(noPriorityA);
      registerErrorRule(noPriorityB);
      const rules = getErrorRules();
      expect(rules.some((r) => r.name === 'no-priority-a')).toBe(true);
      expect(rules.some((r) => r.name === 'no-priority-b')).toBe(true);
      // Default rules with explicit priority > 0 still rank before them.
      const featureGatedIndex = rules.findIndex((r) => r.name === 'feature-gated');
      const noPriorityIndex = rules.findIndex((r) => r.name === 'no-priority-a');
      expect(featureGatedIndex).toBeLessThan(noPriorityIndex);
    });
  });

  describe('resetErrorRules', () => {
    it('removes runtime rules', () => {
      const ephemeral: ErrorRule = {
        name: 'ephemeral',
        match: { status: 418 },
        action: { type: ErrorActionType.Silent },
      };
      registerErrorRule(ephemeral);
      expect(getErrorRules().some((r) => r.name === 'ephemeral')).toBe(true);
      resetErrorRules();
      expect(getErrorRules().some((r) => r.name === 'ephemeral')).toBe(false);
    });
  });

  describe('setLoginRedirectPath', () => {
    it('controls the session-expired redirect target on next reset', () => {
      setLoginRedirectPath('/(auth)/login');
      resetErrorRules();
      const rule = getErrorRules().find((r) => r.name === 'session-expired');
      expect(rule?.action.target).toBe('/(auth)/login');
    });

    it('resetLoginRedirectPath restores default after next reset', () => {
      setLoginRedirectPath('/elsewhere');
      resetLoginRedirectPath();
      resetErrorRules();
      const rule = getErrorRules().find((r) => r.name === 'session-expired');
      expect(rule?.action.target).toBe('/login');
    });
  });
});
