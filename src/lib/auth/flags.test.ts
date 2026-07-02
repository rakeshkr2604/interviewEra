import { describe, expect, it, afterEach } from 'vitest';
import { isAuthV2Enabled } from '@/lib/auth/flags';

describe('isAuthV2Enabled', () => {
  const original = process.env.NEXT_PUBLIC_AUTH_V2;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.NEXT_PUBLIC_AUTH_V2;
    } else {
      process.env.NEXT_PUBLIC_AUTH_V2 = original;
    }
  });

  it('returns false when unset', () => {
    delete process.env.NEXT_PUBLIC_AUTH_V2;
    expect(isAuthV2Enabled()).toBe(false);
  });

  it('returns true when NEXT_PUBLIC_AUTH_V2=1', () => {
    process.env.NEXT_PUBLIC_AUTH_V2 = '1';
    expect(isAuthV2Enabled()).toBe(true);
  });

  it('returns false for other values', () => {
    process.env.NEXT_PUBLIC_AUTH_V2 = 'true';
    expect(isAuthV2Enabled()).toBe(false);
  });
});
