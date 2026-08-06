import { describe, expect, it } from 'vitest';
import { BUILTIN_PLATFORM_ADMIN_EMAILS, isPlatformAdmin } from '@/lib/admin/auth';

describe('isPlatformAdmin', () => {
  it('allows the builtin founder email', () => {
    expect(BUILTIN_PLATFORM_ADMIN_EMAILS).toContain('rakesh.kr2604@gmail.com');
    expect(isPlatformAdmin('rakesh.kr2604@gmail.com')).toBe(true);
    expect(isPlatformAdmin('Rakesh.KR2604@gmail.com')).toBe(true);
  });

  it('rejects unrelated emails when not in ADMIN_EMAILS', () => {
    expect(isPlatformAdmin('random-student@example.com')).toBe(false);
  });
});
