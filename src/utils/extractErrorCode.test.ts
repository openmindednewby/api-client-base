import { extractErrorCode } from './extractErrorCode';

describe('extractErrorCode', () => {
  it('prefers errorCode over code over error', () => {
    expect(extractErrorCode({ errorCode: 'A', code: 'B', error: 'C' })).toBe('A');
    expect(extractErrorCode({ code: 'B', error: 'C' })).toBe('B');
    expect(extractErrorCode({ error: 'C' })).toBe('C');
  });

  it('returns undefined for non-records', () => {
    expect(extractErrorCode(null)).toBeUndefined();
    expect(extractErrorCode(undefined)).toBeUndefined();
    expect(extractErrorCode('string')).toBeUndefined();
    expect(extractErrorCode(123)).toBeUndefined();
  });

  it('returns undefined when fields are missing', () => {
    expect(extractErrorCode({})).toBeUndefined();
    expect(extractErrorCode({ message: 'x' })).toBeUndefined();
  });

  it('returns undefined when fields are empty strings', () => {
    expect(extractErrorCode({ errorCode: '' })).toBeUndefined();
    expect(extractErrorCode({ code: '' })).toBeUndefined();
    expect(extractErrorCode({ error: '' })).toBeUndefined();
  });

  it('returns undefined when fields are non-string', () => {
    expect(extractErrorCode({ errorCode: 123 })).toBeUndefined();
    expect(extractErrorCode({ code: true })).toBeUndefined();
    expect(extractErrorCode({ error: { nested: 'x' } })).toBeUndefined();
  });

  it('skips empty errorCode and falls back to code', () => {
    expect(extractErrorCode({ errorCode: '', code: 'B' })).toBe('B');
  });

  it('skips empty code and falls back to error', () => {
    expect(extractErrorCode({ code: '', error: 'C' })).toBe('C');
  });
});
