import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const usersDeleteEq = vi.fn();
const deleteUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser },
  }),
  createServiceClient: () => ({
    from: () => ({
      delete: () => ({
        eq: (...args: unknown[]) => usersDeleteEq(...args),
      }),
    }),
    auth: { admin: { deleteUser } },
  }),
}));

import { POST } from './route';

function request(body: unknown): Request {
  return new Request('http://localhost/api/account/delete-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/account/delete-account', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires authentication', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const response = await POST(request({ confirmation: 'DELETE MY ACCOUNT' }));
    expect(response.status).toBe(401);
    expect(usersDeleteEq).not.toHaveBeenCalled();
  });

  it('requires the exact confirmation phrase', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    const response = await POST(request({ confirmation: 'delete my account' }));
    expect(response.status).toBe(400);
    expect(usersDeleteEq).not.toHaveBeenCalled();
  });

  it('does not report success when public.users delete fails', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    usersDeleteEq.mockResolvedValue({ error: { message: 'fk' } });
    const response = await POST(request({ confirmation: 'DELETE MY ACCOUNT' }));
    expect(response.status).toBe(500);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('deletes public.users then auth user on success', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    usersDeleteEq.mockResolvedValue({ error: null });
    deleteUser.mockResolvedValue({ error: null });
    const response = await POST(request({ confirmation: 'DELETE MY ACCOUNT' }));
    expect(response.status).toBe(200);
    expect(usersDeleteEq).toHaveBeenCalledWith('id', 'user-1');
    expect(deleteUser).toHaveBeenCalledWith('user-1');
  });
});
