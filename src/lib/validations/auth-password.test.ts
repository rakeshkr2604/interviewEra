import { describe, expect, it } from 'vitest';
import { authPasswordSchema } from './schemas';

describe('authPasswordSchema', () => {
  it('requires the same strong password policy used by the signup API', () => {
    expect(authPasswordSchema.safeParse('ValidPass1!').success).toBe(true);
    expect(authPasswordSchema.safeParse('password').success).toBe(false);
    expect(authPasswordSchema.safeParse('Password1').success).toBe(false);
    expect(authPasswordSchema.safeParse('password1!').success).toBe(false);
  });
});
