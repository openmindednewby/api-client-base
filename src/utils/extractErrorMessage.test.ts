import { extractErrorMessage } from './extractErrorMessage';

describe('extractErrorMessage', () => {
  const FALLBACK = 'fallback';

  it('returns message when present', () => {
    expect(extractErrorMessage({ message: 'oops' }, FALLBACK)).toBe('oops');
  });

  it('falls back to detail', () => {
    expect(extractErrorMessage({ detail: 'd' }, FALLBACK)).toBe('d');
  });

  it('falls back to error', () => {
    expect(extractErrorMessage({ error: 'e' }, FALLBACK)).toBe('e');
  });

  it('falls back to title', () => {
    expect(extractErrorMessage({ title: 't' }, FALLBACK)).toBe('t');
  });

  it('prefers message over detail/error/title', () => {
    expect(
      extractErrorMessage({ message: 'm', detail: 'd', error: 'e', title: 't' }, FALLBACK),
    ).toBe('m');
  });

  it('prefers detail over error/title when message missing', () => {
    expect(extractErrorMessage({ detail: 'd', error: 'e', title: 't' }, FALLBACK)).toBe('d');
  });

  it('prefers error over title when message and detail missing', () => {
    expect(extractErrorMessage({ error: 'e', title: 't' }, FALLBACK)).toBe('e');
  });

  it('returns fallback for non-records', () => {
    expect(extractErrorMessage(null, FALLBACK)).toBe(FALLBACK);
    expect(extractErrorMessage(undefined, FALLBACK)).toBe(FALLBACK);
    expect(extractErrorMessage('string', FALLBACK)).toBe(FALLBACK);
  });

  it('returns fallback when fields are empty', () => {
    expect(extractErrorMessage({}, FALLBACK)).toBe(FALLBACK);
    expect(extractErrorMessage({ message: '' }, FALLBACK)).toBe(FALLBACK);
    expect(
      extractErrorMessage({ message: '', detail: '', error: '', title: '' }, FALLBACK),
    ).toBe(FALLBACK);
  });

  it('returns fallback when fields are non-string', () => {
    expect(extractErrorMessage({ message: 123 }, FALLBACK)).toBe(FALLBACK);
    expect(extractErrorMessage({ detail: true }, FALLBACK)).toBe(FALLBACK);
  });

  it('skips empty message and falls through to other fields', () => {
    expect(extractErrorMessage({ message: '', detail: 'd' }, FALLBACK)).toBe('d');
    expect(extractErrorMessage({ message: '', detail: '', error: 'e' }, FALLBACK)).toBe('e');
    expect(extractErrorMessage({ message: '', detail: '', error: '', title: 't' }, FALLBACK)).toBe(
      't',
    );
  });
});
