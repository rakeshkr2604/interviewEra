import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(() => ({})),
}));

vi.mock('@/lib/campaign-codes', () => ({
  releaseStaleCampaignReservations: vi.fn(),
}));

import { GET } from '@/app/api/cron/release-expired-code-reservations/route';
import { releaseStaleCampaignReservations } from '@/lib/campaign-codes';

describe('GET /api/cron/release-expired-code-reservations', () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.CRON_SECRET;
  });

  it('rejects without CRON_SECRET bearer', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const req = new NextRequest('http://localhost/api/cron/release-expired-code-reservations');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('releases stale reservations when authorized', async () => {
    process.env.CRON_SECRET = 'test-secret';
    vi.mocked(releaseStaleCampaignReservations).mockResolvedValue(3);

    const req = new NextRequest('http://localhost/api/cron/release-expired-code-reservations', {
      headers: { authorization: 'Bearer test-secret' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, released: 3 });
    expect(releaseStaleCampaignReservations).toHaveBeenCalledWith(expect.anything(), 30);
  });
});
