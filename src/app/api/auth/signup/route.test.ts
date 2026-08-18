import { beforeEach, describe, expect, it, vi } from 'vitest';

const createUser = vi.fn();
const checkRateLimit = vi.fn();
const sendSignupVerificationEmail = vi.fn();

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}));

vi.mock('@/lib/redis/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    auth: { admin: { createUser } },
  }),
}));

vi.mock('@/lib/email/lifecycle/send-verification', () => ({
  sendSignupVerificationEmail: (...args: unknown[]) => sendSignupVerificationEmail(...args),
}));

vi.mock('@/lib/referral/capture-referral', () => ({
  captureReferralFromCode: vi.fn(),
}));

import { POST } from './route';

function request(): Parameters<typeof POST>[0] {
  return new Request('http://localhost/api/auth/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify({
      email: 'Student@Example.com',
      password: 'StrongPass1!',
      name: 'Student User',
      next: '/dashboard',
    }),
  }) as Parameters<typeof POST>[0];
}

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
    vi.stubEnv('RESEND_API_KEY', 'resend-key');
    checkRateLimit.mockResolvedValue({ allowed: true, resetInSeconds: 0 });
    sendSignupVerificationEmail.mockResolvedValue({ delivered: true });
  });

  it('creates an unverified password account and sends verification', async () => {
    createUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'student@example.com',
        email_confirm: false,
      }),
    );
    expect(sendSignupVerificationEmail).toHaveBeenCalledWith('student@example.com', {
      name: 'Student User',
      next: '/dashboard',
      password: 'StrongPass1!',
    });
  });

  it('does not reveal whether an email is already registered', async () => {
    createUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'A user with this email already exists' },
    });

    const response = await POST(request());
    const body = (await response.json()) as { ok?: boolean; error?: string };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.error).toBeUndefined();
    expect(sendSignupVerificationEmail).not.toHaveBeenCalled();
  });
});
