import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkRateLimit = vi.fn();
const generateLink = vi.fn();
const sendSignupVerificationEmail = vi.fn();

vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    auth: { admin: { generateLink } },
  }),
}));

vi.mock('@/lib/email/lifecycle/send-verification', () => ({
  sendSignupVerificationEmail: (...args: unknown[]) => sendSignupVerificationEmail(...args),
}));

import { POST } from './route';

function request(body: unknown): Parameters<typeof POST>[0] {
  return new Request('http://localhost/api/auth/resend-verification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify(body),
  }) as Parameters<typeof POST>[0];
}

describe('POST /api/auth/resend-verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RESEND_API_KEY', 'test-key');
    checkRateLimit.mockResolvedValue({ allowed: true, resetInSeconds: 0 });
    generateLink.mockResolvedValue({
      data: {
        user: {
          email: 'admin@college.edu',
          email_confirmed_at: null,
          app_metadata: { providers: ['email'] },
          user_metadata: { name: 'Campus Admin' },
        },
      },
      error: null,
    });
    sendSignupVerificationEmail.mockResolvedValue({ delivered: true });
  });

  it('preserves a safe campus setup destination', async () => {
    const response = await POST(
      request({
        email: 'admin@college.edu',
        next: '/college/setup?status=verified',
      }),
    );

    expect(response.status).toBe(200);
    expect(sendSignupVerificationEmail).toHaveBeenCalledWith('admin@college.edu', {
      name: 'Campus Admin',
      next: '/college/setup?status=verified',
    });
  });

  it('rejects unsafe redirect destinations by falling back to dashboard', async () => {
    const response = await POST(
      request({
        email: 'admin@college.edu',
        next: 'https://evil.example/steal',
      }),
    );

    expect(response.status).toBe(200);
    expect(sendSignupVerificationEmail).toHaveBeenCalledWith('admin@college.edu', {
      name: 'Campus Admin',
      next: '/dashboard',
    });
  });

  it('does not send verification to a trusted Google OAuth account', async () => {
    generateLink.mockResolvedValue({
      data: {
        user: {
          email: 'admin@college.edu',
          email_confirmed_at: null,
          app_metadata: { providers: ['google'] },
          user_metadata: { name: 'Campus Admin' },
        },
      },
      error: null,
    });

    const response = await POST(request({ email: 'admin@college.edu' }));

    expect(response.status).toBe(200);
    expect(sendSignupVerificationEmail).not.toHaveBeenCalled();
  });
});
