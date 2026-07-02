import { describe, expect, it } from 'vitest';
import {
  AUTH_ERROR_CODES,
  AUTH_ERROR_CATALOGUE,
  getAuthErrorDefinition,
  isAuthErrorCode,
  mapAuthErrorMessage,
  normalizeAuthErrorCode,
} from '@/lib/auth/auth-errors';

describe('auth-errors catalogue', () => {
  it('defines all 16 error codes', () => {
    expect(AUTH_ERROR_CODES).toHaveLength(16);
    for (const code of AUTH_ERROR_CODES) {
      expect(AUTH_ERROR_CATALOGUE[code].code).toBe(code);
      expect(AUTH_ERROR_CATALOGUE[code].title.length).toBeGreaterThan(0);
      expect(AUTH_ERROR_CATALOGUE[code].recoveryActions.length).toBeGreaterThan(0);
    }
  });

  it('getAuthErrorDefinition falls back for unknown codes', () => {
    expect(getAuthErrorDefinition('unknown').code).toBe('auth_callback_failed');
    expect(getAuthErrorDefinition('oauth_cancelled').code).toBe('oauth_cancelled');
  });

  it('normalizeAuthErrorCode maps legacy values', () => {
    expect(normalizeAuthErrorCode('access_denied')).toBe('oauth_cancelled');
    expect(normalizeAuthErrorCode('auth_callback_failed')).toBe('auth_callback_failed');
    expect(normalizeAuthErrorCode(null, 'Invalid login credentials')).toBe('invalid_credentials');
    expect(normalizeAuthErrorCode(null, 'Email not confirmed')).toBe('email_not_verified');
    expect(isAuthErrorCode('rate_limited')).toBe(true);
  });

  it('mapAuthErrorMessage returns catalogue description', () => {
    expect(mapAuthErrorMessage('Invalid login credentials')).toContain('Check your details');
  });
});
