import { ApiClient } from './ApiClient';
import { ApiError } from './types/ApiError';

interface FetchCall {
  url: string;
  init: RequestInit;
}

function setupFetch(
  responder: (call: FetchCall) => { status: number; body?: unknown; bodyText?: string },
): { calls: FetchCall[]; restore: () => void } {
  const calls: FetchCall[] = [];
  const original = global.fetch;
  global.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const call: FetchCall = { url: String(input), init };
    calls.push(call);
    const out = responder(call);
    const ok = out.status >= 200 && out.status < 300;
    const text = out.bodyText ?? (out.body !== undefined ? JSON.stringify(out.body) : '');
    const json = out.body;
    return {
      ok,
      status: out.status,
      json: async () => {
        if (json === undefined) throw new Error('no body');
        return json;
      },
      text: async () => text,
    } as unknown as Response;
  }) as typeof global.fetch;
  return {
    calls,
    restore: () => {
      global.fetch = original;
    },
  };
}

describe('ApiClient', () => {
  describe('constructor', () => {
    it('throws when baseUrl is empty', () => {
      expect(() => new ApiClient({ baseUrl: '' })).toThrow('ApiClient: baseUrl is required');
    });

    it('strips trailing slash from baseUrl', () => {
      const c = new ApiClient({ baseUrl: 'https://api.example.com/' });
      expect(c.baseUrl).toBe('https://api.example.com');
    });

    it('exposes timeoutMs default', () => {
      const c = new ApiClient({ baseUrl: 'https://x' });
      expect(c.timeoutMs).toBe(15000);
    });

    it('respects custom timeoutMs', () => {
      const c = new ApiClient({ baseUrl: 'https://x', timeoutMs: 1000 });
      expect(c.timeoutMs).toBe(1000);
    });
  });

  describe('request', () => {
    it('builds URL by joining baseUrl + path with leading slash', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: { ok: 1 } }));
      const c = new ApiClient({ baseUrl: 'https://api.example.com' });
      await c.get('/users');
      expect(calls[0]?.url).toBe('https://api.example.com/users');
      restore();
    });

    it('builds URL by joining baseUrl + path without leading slash', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://api.example.com' });
      await c.get('users');
      expect(calls[0]?.url).toBe('https://api.example.com/users');
      restore();
    });

    it('joins empty path correctly (no extra slash)', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://api.example.com' });
      await c.get('');
      expect(calls[0]?.url).toBe('https://api.example.com');
      restore();
    });

    it('returns parsed JSON for 200 responses', async () => {
      const { restore } = setupFetch(() => ({ status: 200, body: { id: 7 } }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      const result = await c.get<{ id: number }>('/x');
      expect(result).toEqual({ id: 7 });
      restore();
    });

    it('returns undefined for 204 responses', async () => {
      const { restore } = setupFetch(() => ({ status: 204 }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      const result = await c.delete<void>('/x');
      expect(result).toBeUndefined();
      restore();
    });

    it('throws ApiError for non-2xx with envelope details', async () => {
      const { restore } = setupFetch(() => ({
        status: 404,
        body: { errorCode: 'NOT_FOUND', message: 'missing' },
      }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      try {
        await c.get('/x');
        fail('expected throw');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(404);
        expect(apiErr.code).toBe('NOT_FOUND');
        expect(apiErr.message).toBe('missing');
      }
      restore();
    });

    it('throws ApiError with synthetic message when error body is not JSON', async () => {
      const { restore } = setupFetch(() => ({ status: 500, bodyText: 'oops' }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      try {
        await c.get('/x');
        fail('expected throw');
      } catch (err) {
        const apiErr = err as ApiError;
        expect(apiErr.status).toBe(500);
        expect(apiErr.code).toBeUndefined();
        expect(apiErr.message).toBe('Request failed with status 500');
      }
      restore();
    });

    it('serialises plain objects as JSON for POST', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      await c.post('/x', { a: 1 });
      const init = calls[0]?.init;
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe('{"a":1}');
      const headers = init?.headers as Record<string, string>;
      expect(headers['Content-Type']).toBe('application/json');
      restore();
    });

    it('does not serialise FormData (passes through)', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      const fd = new FormData();
      fd.append('k', 'v');
      await c.post('/x', fd);
      const init = calls[0]?.init;
      expect(init?.body).toBe(fd);
      const headers = init?.headers as Record<string, string>;
      expect(headers['Content-Type']).toBeUndefined();
      restore();
    });

    it('does not serialise string bodies', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      await c.post('/x', 'raw');
      const init = calls[0]?.init;
      expect(init?.body).toBe('raw');
      restore();
    });

    it('handles undefined body without setting body', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      await c.get('/x');
      const init = calls[0]?.init;
      expect(init?.body).toBeUndefined();
      restore();
    });

    it('defaults method to GET when caller omits it', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      await c.request({ path: '/x' });
      expect(calls[0]?.init.method).toBe('GET');
      restore();
    });

    it('handles null body without setting body', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      await c.post('/x', null);
      const init = calls[0]?.init;
      // A WRITE with no body still carries an empty JSON body. Asserting `undefined` here is
      // asserting the 415: the server rejects a POST that declares JSON and carries nothing.
      // Reads are unaffected -- see the GET case below.
      expect(init?.body).toBe('{}');
      restore();
    });

    it('does not serialise Blob (passes through)', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      const blob = new Blob(['abc']);
      await c.post('/x', blob);
      expect(calls[0]?.init.body).toBe(blob);
      restore();
    });

    it('does not serialise URLSearchParams (passes through)', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      const params = new URLSearchParams({ a: '1' });
      await c.post('/x', params);
      expect(calls[0]?.init.body).toBe(params);
      restore();
    });

    it('does not serialise ArrayBuffer (passes through)', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      const buf = new ArrayBuffer(8);
      await c.post('/x', buf);
      expect(calls[0]?.init.body).toBe(buf);
      restore();
    });

    it('falls back to default timeoutMs when caller passes undefined explicitly', () => {
      const c = new ApiClient({ baseUrl: 'https://x', timeoutMs: undefined });
      expect(c.timeoutMs).toBe(15000);
    });
  });

  describe('headers', () => {
    it('merges defaultHeaders into every request', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({
        baseUrl: 'https://x',
        defaultHeaders: { 'X-Tenant-Id': 't-1' },
      });
      await c.get('/x');
      const headers = calls[0]?.init.headers as Record<string, string>;
      expect(headers['X-Tenant-Id']).toBe('t-1');
      restore();
    });

    it('per-request headers override default headers', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({
        baseUrl: 'https://x',
        defaultHeaders: { 'X-Tenant-Id': 'default' },
      });
      await c.get('/x', { headers: { 'X-Tenant-Id': 'override' } });
      const headers = calls[0]?.init.headers as Record<string, string>;
      expect(headers['X-Tenant-Id']).toBe('override');
      restore();
    });

    it('injects Authorization from getAccessToken', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({
        baseUrl: 'https://x',
        getAccessToken: () => 'token-abc',
      });
      await c.get('/x');
      const headers = calls[0]?.init.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer token-abc');
      restore();
    });

    it('awaits async getAccessToken', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({
        baseUrl: 'https://x',
        getAccessToken: async () => Promise.resolve('async-token'),
      });
      await c.get('/x');
      const headers = calls[0]?.init.headers as Record<string, string>;
      expect(headers.Authorization).toBe('Bearer async-token');
      restore();
    });

    it('skips Authorization when token is null', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x', getAccessToken: () => null });
      await c.get('/x');
      const headers = calls[0]?.init.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
      restore();
    });

    it('skips Authorization when token is empty', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x', getAccessToken: () => '' });
      await c.get('/x');
      const headers = calls[0]?.init.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
      restore();
    });

    it('honours skipAuth option', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x', getAccessToken: () => 'tok' });
      await c.request({ path: '/x', method: 'GET', skipAuth: true });
      const headers = calls[0]?.init.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
      restore();
    });

    it('does not set Content-Type for body-less GETs', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      await c.get('/x');
      const headers = calls[0]?.init.headers as Record<string, string>;
      expect(headers['Content-Type']).toBeUndefined();
      restore();
    });
  });

  describe('convenience methods', () => {
    it('PUT', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      await c.put('/x', { a: 1 });
      expect(calls[0]?.init.method).toBe('PUT');
      restore();
    });

    it('PATCH', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      await c.patch('/x', { a: 1 });
      expect(calls[0]?.init.method).toBe('PATCH');
      restore();
    });

    it('DELETE', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      await c.delete('/x');
      expect(calls[0]?.init.method).toBe('DELETE');
      restore();
    });

    it('POST with no body', async () => {
      const { calls, restore } = setupFetch(() => ({ status: 200, body: {} }));
      const c = new ApiClient({ baseUrl: 'https://x' });
      await c.post('/x');
      expect(calls[0]?.init.method).toBe('POST');
      // See above: a body-less write must still declare AND carry JSON.
      expect(calls[0]?.init.body).toBe('{}');
      expect((calls[0]?.init.headers as Record<string, string>)['Content-Type']).toBe(
        'application/json',
      );
      restore();
    });
  });
});
