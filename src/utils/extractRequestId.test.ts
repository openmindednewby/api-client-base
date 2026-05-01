import { extractRequestId } from './extractRequestId';

describe('extractRequestId', () => {
  it('returns x-request-id when present', () => {
    expect(extractRequestId({ 'x-request-id': 'abc' })).toBe('abc');
  });

  it('returns x-correlation-id when x-request-id missing', () => {
    expect(extractRequestId({ 'x-correlation-id': 'xyz' })).toBe('xyz');
  });

  it('prefers x-request-id over x-correlation-id', () => {
    expect(
      extractRequestId({ 'x-request-id': 'a', 'x-correlation-id': 'b' }),
    ).toBe('a');
  });

  it('returns undefined for non-records', () => {
    expect(extractRequestId(null)).toBeUndefined();
    expect(extractRequestId(undefined)).toBeUndefined();
    expect(extractRequestId('string')).toBeUndefined();
  });

  it('returns undefined when no correlation header present', () => {
    expect(extractRequestId({})).toBeUndefined();
    expect(extractRequestId({ 'content-type': 'application/json' })).toBeUndefined();
  });

  it('returns undefined when value is empty', () => {
    expect(extractRequestId({ 'x-request-id': '' })).toBeUndefined();
  });

  it('returns undefined when value is non-string', () => {
    expect(extractRequestId({ 'x-request-id': 123 })).toBeUndefined();
    expect(extractRequestId({ 'x-correlation-id': null })).toBeUndefined();
  });

  it('falls through empty x-request-id to x-correlation-id', () => {
    expect(
      extractRequestId({ 'x-request-id': '', 'x-correlation-id': 'fallback' }),
    ).toBe('fallback');
  });
});
