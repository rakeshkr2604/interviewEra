import { beforeEach, describe, expect, it, vi } from 'vitest';

const checkRateLimitMock = vi.fn();
const isRedisConfiguredMock = vi.fn();
const setMock = vi.fn();
const delMock = vi.fn();
const incrbyMock = vi.fn();
const expireMock = vi.fn();
const execMock = vi.fn();

vi.mock('@/lib/redis/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/redis/rate-limit')>(
    '@/lib/redis/rate-limit',
  );
  return {
    ...actual,
    checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
  };
});

vi.mock('@/lib/redis/client', () => ({
  default: () => {
    const pipeline = {
      incrby: (...args: unknown[]) => {
        incrbyMock(...args);
        return pipeline;
      },
      expire: (...args: unknown[]) => {
        expireMock(...args);
        return pipeline;
      },
      exec: (...args: unknown[]) => execMock(...args),
    };
    return {
      set: (...args: unknown[]) => setMock(...args),
      del: (...args: unknown[]) => delMock(...args),
      incrby: (...args: unknown[]) => incrbyMock(...args),
      pipeline: () => pipeline,
    };
  },
  isRedisConfigured: () => isRedisConfiguredMock(),
}));

import {
  acquireBulkInviteOrgLock,
  BULK_INVITE_MAX_RECIPIENTS,
  bulkInviteBodySchema,
  enforceBulkInviteRecipientBudget,
  enforceBulkInviteRequestRateLimit,
  escapeHtml,
  normalizeBulkInviteEmails,
  releaseBulkInviteRecipientBudget,
} from '@/lib/college/bulk-invite-guards';

describe('bulk-invite-guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isRedisConfiguredMock.mockReturnValue(true);
  });

  it('normalizes and dedupes emails', () => {
    const r = normalizeBulkInviteEmails([
      'A@Example.com',
      ' a@example.com ',
      'b@x.com',
      'b@x.com',
    ]);
    expect(r.unique).toEqual(['a@example.com', 'b@x.com']);
    expect(r.duplicateCount).toBe(2);
  });

  it('rejects oversized recipient arrays in schema', () => {
    const emails = Array.from(
      { length: BULK_INVITE_MAX_RECIPIENTS + 1 },
      (_, i) => `u${i}@example.com`,
    );
    expect(bulkInviteBodySchema.safeParse({ emails }).success).toBe(false);
  });

  it('accepts valid payload within cap', () => {
    expect(
      bulkInviteBodySchema.safeParse({
        emails: ['a@example.com'],
        source: 'csv',
      }).success,
    ).toBe(true);
  });

  it('escapes HTML in org/email fields', () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).not.toContain('<script>');
    expect(escapeHtml(`College & Co`)).toContain('&amp;');
  });

  it('request rate limit fail-closed on Redis unavailable', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetInSeconds: 30,
      redisUnavailable: true,
    });
    const res = await enforceBulkInviteRequestRateLimit('user-1');
    expect(res?.status).toBe(503);
    const body = await res?.json();
    expect(body.code).toBe('rate_limit_backend_unavailable');
    expect(JSON.stringify(body)).not.toMatch(/redis|upstash/i);
  });

  it('request rate limit exhaustion returns 429', async () => {
    checkRateLimitMock.mockResolvedValue({
      allowed: false,
      remaining: 0,
      resetInSeconds: 40,
    });
    const res = await enforceBulkInviteRequestRateLimit('user-1');
    expect(res?.status).toBe(429);
  });

  it('recipient budget blocks over-limit and rolls back', async () => {
    execMock.mockResolvedValue([600, 'OK']);
    incrbyMock.mockResolvedValue(100);
    const res = await enforceBulkInviteRecipientBudget('org-1', 200);
    expect(res?.status).toBe(429);
    const body = await res?.json();
    expect(body.code).toBe('bulk_invite_recipient_limit');
    expect(incrbyMock).toHaveBeenCalledWith(expect.stringContaining('bulk_invite:recipients:org-1'), -200);
  });

  it('recipient budget allows under limit', async () => {
    execMock.mockResolvedValue([50, 'OK']);
    await expect(enforceBulkInviteRecipientBudget('org-1', 20)).resolves.toBeNull();
  });

  it('recipient budget fail-closed on Redis error', async () => {
    execMock.mockRejectedValue(new Error('timeout'));
    const res = await enforceBulkInviteRecipientBudget('org-1', 10);
    expect(res?.status).toBe(503);
  });

  it('org lock busy returns 429', async () => {
    setMock.mockResolvedValue(null);
    const r = await acquireBulkInviteOrgLock('org-1');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.response.status).toBe(429);
      const body = await r.response.json();
      expect(body.code).toBe('bulk_invite_in_progress');
    }
  });

  it('org lock acquires and releases', async () => {
    setMock.mockResolvedValue('OK');
    delMock.mockResolvedValue(1);
    const r = await acquireBulkInviteOrgLock('org-1');
    expect(r.ok).toBe(true);
    if (r.ok) {
      await r.lock.release();
      await r.lock.release();
      expect(delMock).toHaveBeenCalledTimes(1);
    }
  });

  it('releaseBulkInviteRecipientBudget refunds cost', async () => {
    incrbyMock.mockResolvedValue(0);
    await releaseBulkInviteRecipientBudget('org-1', 12);
    expect(incrbyMock).toHaveBeenCalledWith(
      expect.stringContaining('bulk_invite:recipients:org-1'),
      -12,
    );
  });
});
