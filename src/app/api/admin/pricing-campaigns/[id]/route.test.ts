import { beforeEach, describe, expect, it, vi } from 'vitest';

const deleteMock = vi.fn();
const paymentSelectMock = vi.fn();
const campaignSelectMock = vi.fn();
const productEventInsert = vi.fn();
const auditInsert = vi.fn();

vi.mock('@/lib/admin/auth', () => ({
  requirePlatformAdmin: async () => ({
    admin: { id: 'admin-uuid-1' },
    error: null,
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: (table: string) => {
      if (table === 'pricing_campaigns') {
        return {
          select: campaignSelectMock,
          delete: () => ({
            eq: deleteMock,
          }),
        };
      }
      if (table === 'payments') {
        return {
          select: paymentSelectMock,
        };
      }
      if (table === 'campaign_audit_logs') return { insert: auditInsert };
      if (table === 'product_events') return { insert: productEventInsert };
      throw new Error(`Unexpected table: ${table}`);
    },
  }),
}));

import { DELETE } from './route';

describe('DELETE /api/admin/pricing-campaigns/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    campaignSelectMock.mockReturnValue({
      eq: () => ({
        maybeSingle: async () => ({
          data: { id: 'camp-123', name: 'Test Campaign' },
          error: null,
        }),
      }),
    });
    deleteMock.mockResolvedValue({ error: null });
    auditInsert.mockResolvedValue({ error: null });
    productEventInsert.mockResolvedValue({ error: null });
  });

  it('blocks hard deletion with 409 if campaign has linked payments', async () => {
    paymentSelectMock.mockReturnValue({
      eq: () => Promise.resolve({ count: 4, error: null }),
    });

    const res = await DELETE(new Request('http://localhost/api/admin/pricing-campaigns/camp-123', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'camp-123' }),
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string; suggestedAction: string };
    expect(body.error).toMatch(/4 payment transaction/);
    expect(body.suggestedAction).toBe('archive');
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('allows hard deletion with 200 if campaign has 0 payments', async () => {
    paymentSelectMock.mockReturnValue({
      eq: () => Promise.resolve({ count: 0, error: null }),
    });

    const res = await DELETE(new Request('http://localhost/api/admin/pricing-campaigns/camp-123', { method: 'DELETE' }), {
      params: Promise.resolve({ id: 'camp-123' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; deletedId: string };
    expect(body.success).toBe(true);
    expect(body.deletedId).toBe('camp-123');
    expect(deleteMock).toHaveBeenCalledWith('id', 'camp-123');
  });
});
