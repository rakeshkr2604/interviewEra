import { describe, expect, it } from 'vitest';
import { hasClientSessionStorageHint } from './client-session-hint';

describe('hasClientSessionStorageHint', () => {
  it('returns false when no auth-token cookie is present', () => {
    expect(hasClientSessionStorageHint('theme=dark')).toBe(false);
  });

  it('returns true when a Supabase auth-token cookie is present', () => {
    expect(hasClientSessionStorageHint('sb-project-auth-token=abc123')).toBe(true);
  });

  it('ignores non-auth-token sb cookies', () => {
    expect(hasClientSessionStorageHint('sb-project-auth-token-code-verifier=xyz')).toBe(false);
  });

  it('returns false for an empty header', () => {
    expect(hasClientSessionStorageHint('')).toBe(false);
  });
});
