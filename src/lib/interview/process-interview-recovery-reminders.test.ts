import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/interview/recovery-email-cadence', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/interview/recovery-email-cadence')>();
  return {
    ...actual,
    isInterviewRecoveryEmailEnabled: vi.fn(() => true),
  };
});

vi.mock('@/lib/email/lifecycle/send-interview-recovery', () => ({
  sendInterviewRecoveryEmailIfEligible: vi.fn(),
}));

vi.mock('@/lib/email/lifecycle/log', () => ({
  wasLifecycleEmailSent: vi.fn(),
}));

import { processInterviewRecoveryReminders } from './process-interview-recovery-reminders';
import { sendInterviewRecoveryEmailIfEligible } from '@/lib/email/lifecycle/send-interview-recovery';
import { wasLifecycleEmailSent } from '@/lib/email/lifecycle/log';
import { isInterviewRecoveryEmailEnabled } from '@/lib/interview/recovery-email-cadence';

function mockSvc(rows: unknown[]) {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
    })),
  };
}

function abandonedRow(id: string, completedAt: string) {
  return {
    id,
    user_id: 'u1',
    role: 'SDE',
    engine: 'v2.1',
    status: 'abandoned',
    credit_deducted: true,
    abandoned_resume_used: false,
    completed_at: completedAt,
  };
}

describe('processInterviewRecoveryReminders', () => {
  beforeEach(() => {
    vi.mocked(isInterviewRecoveryEmailEnabled).mockReturnValue(true);
    vi.mocked(sendInterviewRecoveryEmailIfEligible).mockReset();
    vi.mocked(wasLifecycleEmailSent).mockReset();
    vi.mocked(wasLifecycleEmailSent).mockResolvedValue(false);
  });

  it('flag off + normal: no query and no send', async () => {
    vi.mocked(isInterviewRecoveryEmailEnabled).mockReturnValue(false);
    const svc = { from: vi.fn() };
    const stats = await processInterviewRecoveryReminders(svc as never, {
      dryRun: false,
    });
    expect(stats.enabled).toBe(false);
    expect(stats.dryRun).toBe(false);
    expect(stats.sendsAllowed).toBe(false);
    expect(stats.considered).toBe(0);
    expect(svc.from).not.toHaveBeenCalled();
    expect(sendInterviewRecoveryEmailIfEligible).not.toHaveBeenCalled();
    expect(wasLifecycleEmailSent).not.toHaveBeenCalled();
  });

  it('flag off + dryRun: inventory without send/claim', async () => {
    vi.mocked(isInterviewRecoveryEmailEnabled).mockReturnValue(false);
    const nowMs = Date.parse('2026-06-01T12:00:00.000Z');
    const abandonedAt = new Date(nowMs - 26 * 3600_000).toISOString();
    const svc = mockSvc([abandonedRow('int-1', abandonedAt)]);

    const stats = await processInterviewRecoveryReminders(svc as never, {
      dryRun: true,
      nowMs,
    });

    expect(stats.enabled).toBe(false);
    expect(stats.dryRun).toBe(true);
    expect(stats.sendsAllowed).toBe(false);
    expect(stats.considered).toBeGreaterThan(0);
    expect(sendInterviewRecoveryEmailIfEligible).not.toHaveBeenCalled();
    expect(wasLifecycleEmailSent).not.toHaveBeenCalled();
    expect(stats.suppressReasons.dry_run).toBeGreaterThan(0);
  });

  it('flag on + dryRun: read-only, no send', async () => {
    const nowMs = Date.parse('2026-06-01T12:00:00.000Z');
    const abandonedAt = new Date(nowMs - 26 * 3600_000).toISOString();
    const svc = mockSvc([abandonedRow('int-1', abandonedAt)]);

    const stats = await processInterviewRecoveryReminders(svc as never, {
      dryRun: true,
      nowMs,
    });

    expect(stats.enabled).toBe(true);
    expect(stats.sendsAllowed).toBe(false);
    expect(sendInterviewRecoveryEmailIfEligible).not.toHaveBeenCalled();
    expect(wasLifecycleEmailSent).not.toHaveBeenCalled();
  });

  it('flag on + normal: attempts send for due candidates', async () => {
    const nowMs = Date.parse('2026-06-01T12:00:00.000Z');
    const abandonedAt = new Date(nowMs - 26 * 3600_000).toISOString();
    vi.mocked(sendInterviewRecoveryEmailIfEligible).mockResolvedValue({
      sent: true,
      skipped: false,
      providerMessageId: 'msg_1',
    });

    const svc = mockSvc([abandonedRow('int-1', abandonedAt)]);
    const stats = await processInterviewRecoveryReminders(svc as never, {
      nowMs,
      dryRun: false,
    });

    expect(stats.sendsAllowed).toBe(true);
    expect(sendInterviewRecoveryEmailIfEligible).toHaveBeenCalled();
    expect(stats.sent).toBeGreaterThanOrEqual(1);
  });

  it('skips already-claimed older rows without starving newer send budget', async () => {
    const nowMs = Date.parse('2026-06-01T12:00:00.000Z');
    // 45 older already-claimed + 1 newer unclaimed, all in r1 window
    const rows = Array.from({ length: 45 }, (_, i) =>
      abandonedRow(
        `old-${i}`,
        new Date(nowMs - (48 + i) * 3600_000).toISOString(),
      ),
    );
    rows.push(
      abandonedRow('new-1', new Date(nowMs - 26 * 3600_000).toISOString()),
    );

    vi.mocked(wasLifecycleEmailSent).mockImplementation(async (key: string) =>
      key.includes('new-1') ? false : true,
    );
    vi.mocked(sendInterviewRecoveryEmailIfEligible).mockResolvedValue({
      sent: true,
      skipped: false,
      providerMessageId: 'msg_new',
    });

    const svc = mockSvc(rows);
    const stats = await processInterviewRecoveryReminders(svc as never, {
      nowMs,
      dryRun: false,
      fetchLimit: 200,
      limit: 40,
    });

    expect(sendInterviewRecoveryEmailIfEligible).toHaveBeenCalledWith(
      expect.objectContaining({ interviewId: 'new-1', stage: 'r1' }),
    );
    expect(stats.sent).toBeGreaterThanOrEqual(1);
    expect(stats.suppressReasons.already_sent_or_claimed).toBeGreaterThan(0);
  });
});
