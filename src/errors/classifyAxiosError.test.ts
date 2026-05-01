import { classifyAxiosError } from './classifyAxiosError';
import { HttpMethod } from '../types/HttpMethod';

import type { AxiosErrorLike } from './classifyAxiosError';

describe('classifyAxiosError', () => {
  it('classifies a 404 with full body', () => {
    const err: AxiosErrorLike = {
      message: 'Request failed',
      config: { url: '/api/users/1', method: 'GET' },
      response: {
        status: 404,
        data: { errorCode: 'NOT_FOUND', message: 'User not found' },
        headers: { 'x-request-id': 'req-1' },
      },
    };
    const c = classifyAxiosError(err);
    expect(c.status).toBe(404);
    expect(c.url).toBe('/api/users/1');
    expect(c.method).toBe(HttpMethod.Get);
    expect(c.errorCode).toBe('NOT_FOUND');
    expect(c.message).toBe('User not found');
    expect(c.requestId).toBe('req-1');
    expect(c.body).toEqual({ errorCode: 'NOT_FOUND', message: 'User not found' });
    expect(c.originalError).toBe(err);
    expect(typeof c.timestamp).toBe('number');
  });

  it('classifies a network error (no response)', () => {
    const err: AxiosErrorLike = {
      message: 'Network Error',
      config: { url: '/api/x', method: 'POST' },
    };
    const c = classifyAxiosError(err);
    expect(c.status).toBe(0);
    expect(c.errorCode).toBeUndefined();
    expect(c.message).toBe('Network Error');
    expect(c.requestId).toBeUndefined();
  });

  it('classifies a timeout', () => {
    const err: AxiosErrorLike = {
      message: 'timeout',
      code: 'ECONNABORTED',
      config: { url: '/api/x', method: 'GET' },
    };
    const c = classifyAxiosError(err);
    expect(c.errorCode).toBe('ECONNABORTED');
  });

  it('prefers extracted error code over timeout code when both present', () => {
    const err: AxiosErrorLike = {
      message: 'timeout',
      code: 'ECONNABORTED',
      config: { url: '/api/x', method: 'GET' },
      response: { status: 408, data: { errorCode: 'CUSTOM' } },
    };
    const c = classifyAxiosError(err);
    expect(c.errorCode).toBe('CUSTOM');
  });

  it('defaults to GET for missing/unknown methods', () => {
    expect(classifyAxiosError({ config: { url: '/x' } }).method).toBe(HttpMethod.Get);
    expect(classifyAxiosError({ config: { url: '/x', method: 'OPTIONS' } }).method).toBe(
      HttpMethod.Get,
    );
  });

  it('maps standard methods correctly', () => {
    const post: AxiosErrorLike = { config: { method: 'post' } };
    const put: AxiosErrorLike = { config: { method: 'PUT' } };
    const patch: AxiosErrorLike = { config: { method: 'PaTcH' } };
    const del: AxiosErrorLike = { config: { method: 'delete' } };
    expect(classifyAxiosError(post).method).toBe(HttpMethod.Post);
    expect(classifyAxiosError(put).method).toBe(HttpMethod.Put);
    expect(classifyAxiosError(patch).method).toBe(HttpMethod.Patch);
    expect(classifyAxiosError(del).method).toBe(HttpMethod.Delete);
  });

  it('uses empty string when url missing', () => {
    expect(classifyAxiosError({}).url).toBe('');
  });

  it('uses empty fallback message when source provides none', () => {
    const c = classifyAxiosError({});
    expect(c.message).toBe('');
  });

  it('extracts message from response body when present', () => {
    const c = classifyAxiosError({
      message: 'fallback',
      response: { status: 400, data: { detail: 'bad input' } },
    });
    expect(c.message).toBe('bad input');
  });

  it('falls back to error.message when body has no message', () => {
    const c = classifyAxiosError({
      message: 'fallback',
      response: { status: 500, data: {} },
    });
    expect(c.message).toBe('fallback');
  });
});
