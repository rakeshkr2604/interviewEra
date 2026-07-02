import { describe, expect, it } from 'vitest';
import { isSafePath, parseAuthParams, sanitizeNext } from '@/lib/auth/auth-params';

describe('isSafePath', () => {
  it('accepts valid same-origin paths', () => {
    expect(isSafePath('/dashboard')).toBe(true);
    expect(isSafePath('/college/join/abc')).toBe(true);
    expect(isSafePath('/path?query=1')).toBe(true);
    expect(isSafePath('/interview/new')).toBe(true);
  });

  it('rejects protocol-relative and scheme paths', () => {
    expect(isSafePath('//evil.com')).toBe(false);
    expect(isSafePath('javascript:alert(1)')).toBe(false);
    expect(isSafePath('https://evil.com')).toBe(false);
  });

  it('rejects empty, null, and undefined', () => {
    expect(isSafePath('')).toBe(false);
    expect(isSafePath(null)).toBe(false);
    expect(isSafePath(undefined)).toBe(false);
    expect(isSafePath('   ')).toBe(false);
  });

  it('rejects paths without leading slash', () => {
    expect(isSafePath('dashboard')).toBe(false);
    expect(isSafePath('evil.com/path')).toBe(false);
  });
});

describe('sanitizeNext', () => {
  it('returns validated path when safe', () => {
    expect(sanitizeNext('/college/dashboard')).toBe('/college/dashboard');
  });

  it('returns fallback for unsafe paths', () => {
    expect(sanitizeNext('//evil.com')).toBe('/dashboard');
    expect(sanitizeNext(null)).toBe('/dashboard');
    expect(sanitizeNext(undefined, '/login')).toBe('/login');
  });
});

describe('parseAuthParams', () => {
  it('parses next, email, and reason', () => {
    const params = new URLSearchParams(
      'next=/dashboard&email=user@example.com&reason=session_expired',
    );
    expect(parseAuthParams(params)).toEqual({
      next: '/dashboard',
      email: 'user@example.com',
      reason: 'session_expired',
    });
  });

  it('omits unsafe next', () => {
    const params = new URLSearchParams('next=//evil.com&email=a@b.com');
    expect(parseAuthParams(params)).toEqual({ email: 'a@b.com' });
  });

  it('ignores unknown reason values', () => {
    const params = new URLSearchParams('reason=unknown');
    expect(parseAuthParams(params)).toEqual({});
  });
});
