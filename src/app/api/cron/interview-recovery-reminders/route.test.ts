import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({})),
}));

vi.mock('@/lib/interview/process-interview-recovery-reminders', () => ({
  processInterviewRecoveryReminders: vi.fn(),
}));

import { GET } from '@/app/api/cron/interview-recovery-reminders/route';
import { processInterviewRecoveryReminders } from '@/lib/interview/process-interview-recovery-reminders';

describe('GET /api/cron/interview-recovery-reminders', () => {
  const prev = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
    vi.mocked(processInterviewRecoveryReminders).mockResolvedValue({
      enabled: false,
      dryRun: false,
      sendsAllowed: false,
      considered: 0,
      eligibleAttempted: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      byStage: {
        r1: { considered: 0, sent: 0, skipped: 0, failed: 0 },
        r2: { considered: 0, sent: 0, skipped: 0, failed: 0 },
      },
      suppressReasons: {},
    });
  });

  afterEach(() => {
    process.env.CRON_SECRET = prev;
  });

  function authReq(url: string) {
    return new NextRequest(url, {
      headers: { authorization: 'Bearer test-cron-secret' },
    });
  }

  it('rejects unauthorized requests', async () => {
    const req = new NextRequest(
      'http://localhost/api/cron/interview-recovery-reminders',
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(processInterviewRecoveryReminders).not.toHaveBeenCalled();
  });

  it('flag-agnostic: dryRun=1 passes dryRun true', async () => {
    const res = await GET(
      authReq('http://localhost/api/cron/interview-recovery-reminders?dryRun=1'),
    );
    expect(res.status).toBe(200);
    expect(processInterviewRecoveryReminders).toHaveBeenCalledWith(
      expect.anything(),
      { dryRun: true },
    );
  });

  it('absent dryRun passes dryRun false', async () => {
    await GET(authReq('http://localhost/api/cron/interview-recovery-reminders'));
    expect(processInterviewRecoveryReminders).toHaveBeenCalledWith(
      expect.anything(),
      { dryRun: false },
    );
  });

  it('ambiguous dryRun values force dryRun true (never send)', async () => {
    for (const value of ['0', 'true', 'yes', '']) {
      vi.mocked(processInterviewRecoveryReminders).mockClear();
      const url =
        value === ''
          ? 'http://localhost/api/cron/interview-recovery-reminders?dryRun='
          : `http://localhost/api/cron/interview-recovery-reminders?dryRun=${value}`;
      await GET(authReq(url));
      expect(processInterviewRecoveryReminders).toHaveBeenCalledWith(
        expect.anything(),
        { dryRun: true },
      );
    }
  });
});
