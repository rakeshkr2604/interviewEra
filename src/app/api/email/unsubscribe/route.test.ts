import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyUnsubToken = vi.fn();
const updateEq = vi.fn();

vi.mock('@/lib/email/weekly-digest', () => ({
  verifyUnsubToken: (...args: unknown[]) => verifyUnsubToken(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: () => ({
      update: () => ({
        eq: (...args: unknown[]) => updateEq(...args),
      }),
    }),
  }),
}));

import { GET } from './route';

describe('GET /api/email/unsubscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects missing token parameters', async () => {
    const response = await GET(new Request('http://localhost/api/email/unsubscribe'));
    expect(response.status).toBe(400);
    expect(verifyUnsubToken).not.toHaveBeenCalled();
  });

  it('rejects invalid tokens', async () => {
    verifyUnsubToken.mockReturnValue(false);
    const response = await GET(
      new Request('http://localhost/api/email/unsubscribe?userId=u1&token=bad'),
    );
    expect(response.status).toBe(400);
    expect(updateEq).not.toHaveBeenCalled();
  });

  it('does not claim success when the database update fails', async () => {
    verifyUnsubToken.mockReturnValue(true);
    updateEq.mockResolvedValue({ error: { message: 'db down' } });
    const response = await GET(
      new Request('http://localhost/api/email/unsubscribe?userId=u1&token=ok'),
    );
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text.toLowerCase()).not.toContain('unsubscribed');
  });

  it('updates digest preference on valid token', async () => {
    verifyUnsubToken.mockReturnValue(true);
    updateEq.mockResolvedValue({ error: null });
    const response = await GET(
      new Request('http://localhost/api/email/unsubscribe?userId=u1&token=ok'),
    );
    expect(response.status).toBe(200);
    expect(updateEq).toHaveBeenCalledWith('id', 'u1');
    expect(await response.text()).toContain("You've been unsubscribed");
  });
});
