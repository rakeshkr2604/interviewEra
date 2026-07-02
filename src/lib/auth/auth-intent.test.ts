import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AUTH_INTENT,
  isAuthIntent,
  parseAuthIntent,
  parseIntentFromSearchParams,
} from '@/lib/auth/auth-intent';

describe('auth-intent', () => {
  it('recognizes valid intents', () => {
    expect(isAuthIntent('candidate')).toBe(true);
    expect(isAuthIntent('college')).toBe(true);
    expect(isAuthIntent('business')).toBe(true);
    expect(isAuthIntent('invalid')).toBe(false);
    expect(isAuthIntent(null)).toBe(false);
  });

  it('parseAuthIntent defaults to candidate', () => {
    expect(parseAuthIntent(null)).toBe(DEFAULT_AUTH_INTENT);
    expect(parseAuthIntent('')).toBe(DEFAULT_AUTH_INTENT);
    expect(parseAuthIntent('college')).toBe('college');
  });

  it('parseIntentFromSearchParams reads intent query', () => {
    expect(parseIntentFromSearchParams(new URLSearchParams('intent=business'))).toBe('business');
    expect(parseIntentFromSearchParams(new URLSearchParams())).toBe('candidate');
  });
});
