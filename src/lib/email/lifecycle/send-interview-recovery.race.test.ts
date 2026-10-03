/**
 * Deterministic race: eligibility changes between first load and revalidation
 * (before claim/Resend). Asserts sendLifecycleTemplate is not invoked.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendLifecycleMock = vi.hoisted(() => vi.fn());
const wasSentMock = vi.hoisted(() => vi.fn());
const enabledMock = vi.hoisted(() => vi.fn(() => true));

vi.mock('@/lib/interview/recovery-email-cadence', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/interview/recovery-email-cadence')>();
  return {
    ...actual,
    isInterviewRecoveryEmailEnabled: (...args: unknown[]) => enabledMock(...args),
  };
});

vi.mock('@/lib/email/lifecycle/send-template', () => ({
  sendLifecycleTemplate: (...args: unknown[]) => sendLifecycleMock(...args),
}));

vi.mock('@/lib/email/lifecycle/log', () => ({
  wasLifecycleEmailSent: (...args: unknown[]) => wasSentMock(...args),
}));

vi.mock('@/lib/auth/verified-email-policy', () => ({
  hasVerifiedEmail: () => true,
}));

vi.mock('@/lib/server/get-base-url', () => ({
  getEmailAppUrl: () => 'https://interviewera.com',
}));

type InterviewRow = {
  id: string;
  user_id: string;
  role: string;
  engine: string;
  status: string;
  credit_deducted: boolean;
  abandoned_resume_used: boolean;
  completed_at: string;
};

type UserRow = {
  name: string;
  email: string;
  notification_preferences: Record<string, boolean>;
  email_digest_unsubscribed: boolean;
};

const interviewLoads = vi.hoisted(() => ({
  queue: [] as InterviewRow[],
}));

const userLoads = vi.hoisted(() => ({
  queue: [] as UserRow[],
}));

const emailPrefLoads = vi.hoisted(() => ({
  queue: [] as Array<{ unsubscribed_all: boolean } | null>,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'interviews') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                const next = interviewLoads.queue.shift();
                return { data: next ?? null, error: null };
              },
            }),
          }),
        };
      }
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                const next = userLoads.queue.shift();
                return { data: next ?? null, error: null };
              },
            }),
          }),
        };
      }
      if (table === 'email_preferences') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => {
                const next =
                  emailPrefLoads.queue.length > 0
                    ? emailPrefLoads.queue.shift()
                    : { unsubscribed_all: false };
                return { data: next ?? null, error: null };
              },
            }),
          }),
        };
      }
      return {};
    },
    auth: {
      admin: {
        getUserById: async () => ({
          data: {
            user: {
              id: 'user-1',
              email: 'alex@example.com',
              email_confirmed_at: '2026-01-01T00:00:00.000Z',
              user_metadata: { name: 'Alex' },
            },
          },
          error: null,
        }),
      },
    },
  }),
}));

import { sendInterviewRecoveryEmailIfEligible } from './send-interview-recovery';

const eligibleRow = (): InterviewRow => ({
  id: 'int-race',
  user_id: 'user-1',
  role: 'SDE',
  engine: 'v2.1',
  status: 'abandoned',
  credit_deducted: true,
  abandoned_resume_used: false,
  completed_at: new Date(Date.now() - 30 * 3600_000).toISOString(),
});

const userRow = (
  overrides?: Partial<UserRow>,
): UserRow => ({
  name: 'Alex',
  email: 'alex@example.com',
  notification_preferences: {
    interviewReminders: true,
    performanceReports: true,
    productUpdates: true,
    marketingEmails: true,
  },
  email_digest_unsubscribed: false,
  ...overrides,
});

describe('sendInterviewRecoveryEmailIfEligible — pre-claim revalidation', () => {
  beforeEach(() => {
    enabledMock.mockReturnValue(true);
    wasSentMock.mockResolvedValue(false);
    sendLifecycleMock.mockReset();
    sendLifecycleMock.mockResolvedValue({
      sent: true,
      skipped: false,
      providerMessageId: 'msg',
    });
    interviewLoads.queue = [];
    userLoads.queue = [];
    emailPrefLoads.queue = [];
  });

  it('skips claim/send when interview is resumed between loads', async () => {
    interviewLoads.queue = [
      eligibleRow(),
      { ...eligibleRow(), status: 'in_progress', abandoned_resume_used: true },
    ];
    userLoads.queue = [userRow(), userRow()];

    const result = await sendInterviewRecoveryEmailIfEligible({
      interviewId: 'int-race',
      stage: 'r1',
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('not_abandoned_eligible');
    expect(sendLifecycleMock).not.toHaveBeenCalled();
  });

  it('skips when interviewReminders opted out between loads', async () => {
    interviewLoads.queue = [eligibleRow(), eligibleRow()];
    userLoads.queue = [
      userRow(),
      userRow({
        notification_preferences: {
          interviewReminders: false,
          performanceReports: true,
          productUpdates: true,
          marketingEmails: true,
        },
      }),
    ];

    const result = await sendInterviewRecoveryEmailIfEligible({
      interviewId: 'int-race',
      stage: 'r1',
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('reminders_opted_out');
    expect(sendLifecycleMock).not.toHaveBeenCalled();
  });

  it('skips when email_digest_unsubscribed flips between loads', async () => {
    interviewLoads.queue = [eligibleRow(), eligibleRow()];
    userLoads.queue = [
      userRow({ email_digest_unsubscribed: false }),
      userRow({ email_digest_unsubscribed: true }),
    ];

    const result = await sendInterviewRecoveryEmailIfEligible({
      interviewId: 'int-race',
      stage: 'r1',
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('globally_unsubscribed');
    expect(sendLifecycleMock).not.toHaveBeenCalled();
  });

  it('skips when email_preferences.unsubscribed_all is true on revalidation', async () => {
    interviewLoads.queue = [eligibleRow(), eligibleRow()];
    userLoads.queue = [userRow(), userRow()];
    emailPrefLoads.queue = [
      { unsubscribed_all: false },
      { unsubscribed_all: true },
    ];

    const result = await sendInterviewRecoveryEmailIfEligible({
      interviewId: 'int-race',
      stage: 'r1',
    });

    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('globally_unsubscribed');
    expect(sendLifecycleMock).not.toHaveBeenCalled();
  });
});
