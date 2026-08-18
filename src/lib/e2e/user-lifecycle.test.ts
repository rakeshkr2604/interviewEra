import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  PRODUCTION_SUPABASE_PROJECT_REF,
  STAGING_SUPABASE_PROJECT_REF,
} from '@/lib/env/staging-environment';
import {
  buildE2eEmail,
  createE2eUser,
  destroyE2eUser,
  ensurePersistentE2eUser,
  markE2eUser,
} from '@/lib/e2e/user-lifecycle';

const STAGING_URL = `https://${STAGING_SUPABASE_PROJECT_REF}.supabase.co`;
const PRODUCTION_URL = `https://${PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`;

function mockAdmin(opts?: {
  createError?: { message: string } | null;
  createdUserId?: string;
  lookupId?: string | null;
  lookupError?: { message: string } | null;
  deleteDbError?: { message: string } | null;
  deleteAuthError?: { message: string } | null;
}) {
  const order: string[] = [];
  const createUser = vi.fn(async (payload: { user_metadata?: Record<string, unknown> }) => {
    order.push('auth.createUser');
    if (opts?.createError) return { data: { user: null }, error: opts.createError };
    return {
      data: { user: { id: opts?.createdUserId ?? 'user-1' } },
      error: null,
      payload,
    };
  });
  const updateUserById = vi.fn(async () => {
    order.push('auth.updateUserById');
    return { error: null };
  });
  const deleteUser = vi.fn(async () => {
    order.push('auth.deleteUser');
    return { error: opts?.deleteAuthError ?? null };
  });
  const eqDelete = vi.fn(async () => {
    order.push('public.users.delete');
    return { error: opts?.deleteDbError ?? null };
  });
  const eqLookup = vi.fn(async () => {
    order.push('public.users.lookup');
    return {
      data: opts?.lookupId ? { id: opts.lookupId } : null,
      error: opts?.lookupError ?? null,
    };
  });
  const maybeSingle = vi.fn(() => eqLookup());
  const selectEq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq: selectEq }));
  const del = vi.fn(() => ({ eq: eqDelete }));
  const from = vi.fn((table: string) => {
    if (table !== 'users') throw new Error(`unexpected table ${table}`);
    return { delete: del, select };
  });

  const admin = {
    from,
    auth: { admin: { createUser, updateUserById, deleteUser } },
  } as unknown as SupabaseClient;

  return { admin, order, createUser, updateUserById, deleteUser, eqDelete };
}

describe('buildE2eEmail', () => {
  it('uses the interviewera-mail.test domain', () => {
    expect(buildE2eEmail('e2e-a11y+123')).toBe('e2e-a11y+123@interviewera-mail.test');
  });
});

describe('createE2eUser / destroyE2eUser', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = STAGING_URL;
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  });

  it('forces user_metadata.e2e = true on create', async () => {
    const { admin, createUser } = mockAdmin();
    const user = await createE2eUser(admin, {
      emailLocalPrefix: 'e2e-a11y+1',
      userMetadata: { name: 'E2E' },
    });
    expect(user.id).toBe('user-1');
    expect(user.email).toBe('e2e-a11y+1@interviewera-mail.test');
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email_confirm: true,
        user_metadata: { name: 'E2E', e2e: true },
      }),
    );
  });

  it('deletes public.users before auth.admin.deleteUser', async () => {
    const { admin, order, eqDelete, deleteUser } = mockAdmin();
    await destroyE2eUser(admin, 'user-1');
    expect(order).toEqual(['public.users.delete', 'auth.deleteUser']);
    expect(eqDelete).toHaveBeenCalled();
    expect(deleteUser).toHaveBeenCalledWith('user-1');
  });

  it('does not call Auth delete if public.users delete fails', async () => {
    const { admin, order, deleteUser } = mockAdmin({
      deleteDbError: { message: 'fk restrict' },
    });
    await expect(destroyE2eUser(admin, 'user-1')).rejects.toThrow(/public.users delete failed/);
    expect(order).toEqual(['public.users.delete']);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('refuses create against production without calling Auth', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = PRODUCTION_URL;
    const { admin, createUser } = mockAdmin();
    await expect(createE2eUser(admin, { emailLocalPrefix: 'nope' })).rejects.toThrow(
      /target is production/,
    );
    expect(createUser).not.toHaveBeenCalled();
  });

  it('refuses destroy against production without deleting rows', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = PRODUCTION_URL;
    const { admin, eqDelete, deleteUser } = mockAdmin();
    await expect(destroyE2eUser(admin, 'user-1')).rejects.toThrow(/target is production/);
    expect(eqDelete).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('marks an existing persistent user with e2e metadata and does not delete', async () => {
    const { admin, updateUserById, deleteUser, createUser } = mockAdmin({
      createError: { message: 'User already registered' },
      lookupId: 'existing-1',
    });
    const result = await ensurePersistentE2eUser(admin, {
      email: 'stable@interviewera-mail.test',
      password: 'E2eA11yPass1!',
    });
    expect(result).toEqual({
      id: 'existing-1',
      email: 'stable@interviewera-mail.test',
      created: false,
    });
    expect(createUser).toHaveBeenCalled();
    expect(updateUserById).toHaveBeenCalledWith(
      'existing-1',
      expect.objectContaining({ user_metadata: { e2e: true } }),
    );
    expect(deleteUser).not.toHaveBeenCalled();
  });
});

describe('markE2eUser', () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = STAGING_URL;
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
  });

  it('always sets e2e true even if caller passes e2e false', async () => {
    const { admin, updateUserById } = mockAdmin();
    await markE2eUser(admin, 'user-1', { e2e: false, name: 'x' });
    expect(updateUserById).toHaveBeenCalledWith('user-1', {
      user_metadata: { e2e: true, name: 'x' },
    });
  });
});
