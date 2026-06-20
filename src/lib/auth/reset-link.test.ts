import { describe, expect, it } from 'vitest';
import { buildPasswordResetConfirmUrl } from '@/lib/auth/reset-link';

describe('buildPasswordResetConfirmUrl', () => {
  it('points to app /auth/confirm with token_hash (not Supabase verify URL)', () => {
    const url = buildPasswordResetConfirmUrl('abc123token', 'https://interviewera.com');
    const parsed = new URL(url);
    expect(parsed.origin).toBe('https://interviewera.com');
    expect(parsed.pathname).toBe('/auth/confirm');
    expect(parsed.searchParams.get('token_hash')).toBe('abc123token');
    expect(parsed.searchParams.get('type')).toBe('recovery');
    expect(parsed.searchParams.get('next')).toBe('/reset-password');
    expect(url).not.toContain('supabase.co');
  });
});
