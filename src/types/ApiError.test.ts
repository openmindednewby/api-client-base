import { ApiError } from './ApiError';

describe('ApiError', () => {
  it('extends Error and exposes envelope fields', () => {
    const err = new ApiError({
      status: 404,
      code: 'NOT_FOUND',
      message: 'missing',
      details: { hint: 'check id' },
    });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('missing');
    expect(err.details).toEqual({ hint: 'check id' });
  });

  it('allows code and details to be omitted', () => {
    const err = new ApiError({ status: 500, message: 'server error' });
    expect(err.code).toBeUndefined();
    expect(err.details).toBeUndefined();
  });

  it('preserves prototype across transpilation', () => {
    const err = new ApiError({ status: 401, message: 'unauth' });
    // Simulate caller pattern: catch (e) { if (e instanceof ApiError) ... }
    const caught: unknown = err;
    expect(caught instanceof ApiError).toBe(true);
  });
});
