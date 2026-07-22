import { describe, expect, it } from 'vitest';
import { contactFormSchema } from './contact';

describe('contactFormSchema', () => {
  it('accepts valid input', () => {
    const result = contactFormSchema.safeParse({
      name: 'Rakesh Kumar',
      email: 'user@example.com',
      message: 'I need help with my account billing.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short messages', () => {
    const result = contactFormSchema.safeParse({
      name: 'Test User',
      email: 'user@example.com',
      message: 'Hi',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = contactFormSchema.safeParse({
      name: 'Test User',
      email: 'not-an-email',
      message: 'This is a long enough message.',
    });
    expect(result.success).toBe(false);
  });
});
