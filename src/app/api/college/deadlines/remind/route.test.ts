import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const checkRateLimit = vi.fn();
const orgSingle = vi.fn();
const deadlineSingle = vi.fn();
const enrollmentsSelect = vi.fn();
const emailsSend = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: (...args: unknown[]) => getUser(...args) },
  }),
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'campus_organizations') {
        return {
          select: () => ({
            eq: () => ({
              single: (...args: unknown[]) => orgSingle(...args),
            }),
          }),
        };
      }
      if (table === 'college_deadlines') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: (...args: unknown[]) => deadlineSingle(...args),
              }),
            }),
          }),
        };
      }
      if (table === 'college_enrollments') {
        return {
          select: () => ({
            eq: (...args: unknown[]) => enrollmentsSelect(...args),
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  }),
}));

vi.mock('@/lib/redis/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/redis/rate-limit')>(
    '@/lib/redis/rate-limit',
  );
  return {
    ...actual,
    checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
  };
});

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: (...args: unknown[]) => emailsSend(...args) };
  },
}));

vi.mock('@/lib/server/get-base-url', () => ({
  getBaseUrl: () => 'https://interviewera.com',
}));

import { POST } from './route';

function request(body: unknown): Parameters<typeof POST>[0] {
  return new Request('http://localhost/api/college/deadlines/remind', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '1.1.1.1' },
    body: JSON.stringify(body),
  }) as Parameters<typeof POST>[0];
}

describe('POST /api/college/deadlines/remind', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('RESEND_API_KEY', 're_test');
    getUser.mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null });
    checkRateLimit.mockResolvedValue({ allowed: true, remaining: 2, resetInSeconds: 60 });
    orgSingle.mockResolvedValue({
      data: { id: 'org-1', name: 'Demo College', verification_status: 'approved' },
      error: null,
    });
    deadlineSingle.mockResolvedValue({
      data: {
        due_date: '2026-10-10',
        target_value: 3,
        deadline_type: 'interviews',
        description: 'Complete 3 mocks',
      },
      error: null,
    });
    enrollmentsSelect.mockResolvedValue({
      data: [{ users: { email: 'student@college.edu' } }],
      error: null,
    });
    emailsSend.mockResolvedValue({ id: 'msg_1' });
  });

  it('rejects unbounded / invalid payloads before send', async () => {
    const res = await POST(
      request({
        deadlineId: 'not-a-uuid',
        emails: ['student@college.edu'],
      }),
    );
    expect(res.status).toBe(400);
    expect(emailsSend).not.toHaveBeenCalled();
  });

  it('does not send to emails outside the org enrollment list', async () => {
    const res = await POST(
      request({
        deadlineId: '11111111-1111-4111-8111-111111111111',
        emails: ['outsider@evil.com', 'student@college.edu'],
        deadlineDescription: '<script>x</script>',
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sent).toBe(1);
    expect(json.skipped).toBe(1);
    expect(emailsSend).toHaveBeenCalledTimes(1);
    expect(emailsSend.mock.calls[0][0].to).toBe('student@college.edu');
    expect(String(emailsSend.mock.calls[0][0].html)).not.toContain('<script>');
    expect(String(emailsSend.mock.calls[0][0].html)).toContain('Complete 3 mocks');
  });

  it('fails closed when Redis is unavailable', async () => {
    checkRateLimit.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetInSeconds: 30,
      redisUnavailable: true,
    });
    const res = await POST(
      request({
        deadlineId: '11111111-1111-4111-8111-111111111111',
        emails: ['student@college.edu'],
      }),
    );
    expect(res.status).toBe(503);
    expect(emailsSend).not.toHaveBeenCalled();
  });
});
