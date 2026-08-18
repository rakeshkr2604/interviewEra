import { describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

vi.mock('@/lib/admin/auth', () => ({
  requirePlatformAdmin: async () => ({
    admin: null,
    error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => {
    throw new Error('service client must not be used for unauthorized admin requests');
  },
}));

import { GET, POST } from './route';

describe('admin pricing campaigns authorization', () => {
  it('rejects unauthenticated list and create', async () => {
    const list = await GET();
    expect(list.status).toBe(401);

    const create = await POST(
      new Request('http://localhost/api/admin/pricing-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );
    expect(create.status).toBe(401);
  });
});
