/**
 * Shared E2E / live-verify user create + destroy.
 * Destroy order matches POST /api/account/delete-account:
 *   public.users (CASCADE children) → auth.admin.deleteUser()
 * Never mutates production — assertE2eSupabaseTargetNotProduction runs first.
 */

import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  assertE2eSupabaseTargetNotProduction,
  isNonMutatingE2eTarget,
  resolveE2eSupabaseTarget,
} from './target-guard';

const LOG_PREFIX = '[e2e-lifecycle]';

export const E2E_EMAIL_DOMAIN = 'interviewera-mail.test';
export const EPHEMERAL_USER_RECORD_PATH = join(
  process.cwd(),
  'e2e',
  '.auth',
  'ephemeral-user.json',
);

export type CreatedE2eUser = {
  id: string;
  email: string;
  password: string;
};

export type EphemeralUserRecord = {
  userId: string;
  email: string;
  createdAt: string;
};

export type CreateE2eUserOptions = {
  email?: string;
  password?: string;
  emailLocalPrefix?: string;
  userMetadata?: Record<string, unknown>;
};

function supabaseUrlFromEnv(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
}

function assertMutableTarget(): void {
  const target = assertE2eSupabaseTargetNotProduction(supabaseUrlFromEnv());
  if (target.kind === 'missing' || target.kind === 'placeholder') {
    throw new Error(
      `${LOG_PREFIX} Refusing user mutation: Supabase target is ${target.kind}.`,
    );
  }
}

export function buildE2eEmail(localPrefix: string): string {
  const local = localPrefix.trim().replace(/[^a-zA-Z0-9._+-]/g, '-');
  if (!local) throw new Error(`${LOG_PREFIX} email local-part is empty`);
  return `${local}@${E2E_EMAIL_DOMAIN}`;
}

function mergeE2eMetadata(
  extra: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return { ...extra, e2e: true };
}

export async function createE2eUser(
  admin: SupabaseClient,
  options: CreateE2eUserOptions = {},
): Promise<CreatedE2eUser> {
  assertMutableTarget();

  const email =
    options.email?.trim() ||
    buildE2eEmail(options.emailLocalPrefix ?? `e2e-${Date.now()}`);
  const password =
    options.password?.trim() || `E2ePass1!${Date.now().toString(36)}`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: mergeE2eMetadata(options.userMetadata),
  });
  if (error || !data.user?.id) {
    throw new Error(`${LOG_PREFIX} createUser failed: ${error?.message ?? 'no user id'}`);
  }

  console.log(`${LOG_PREFIX} created userId=${data.user.id} metadata.e2e=true`);
  return { id: data.user.id, email, password };
}

/**
 * Reuse a stable E2E_TEST_EMAIL account. Creates it if missing; always sets
 * user_metadata.e2e = true. Never treated as ephemeral (teardown must not delete).
 */
export async function ensurePersistentE2eUser(
  admin: SupabaseClient,
  args: { email: string; password: string; userMetadata?: Record<string, unknown> },
): Promise<{ id: string; email: string; created: boolean }> {
  assertMutableTarget();

  const email = args.email.trim();
  const password = args.password;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: mergeE2eMetadata(args.userMetadata),
  });

  if (!error && data.user?.id) {
    console.log(`${LOG_PREFIX} created persistent userId=${data.user.id} metadata.e2e=true`);
    return { id: data.user.id, email, created: true };
  }

  const already = error?.message.toLowerCase().includes('already') === true;
  if (!already) {
    throw new Error(`${LOG_PREFIX} ensure persistent user failed: ${error?.message ?? 'unknown'}`);
  }

  const { data: row, error: lookupError } = await admin
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (lookupError) {
    throw new Error(`${LOG_PREFIX} lookup persistent user failed: ${lookupError.message}`);
  }
  const userId = row?.id as string | undefined;
  if (!userId) {
    throw new Error(`${LOG_PREFIX} persistent E2E email exists in Auth but not in public.users`);
  }

  await markE2eUser(admin, userId, args.userMetadata);
  console.log(`${LOG_PREFIX} reused persistent userId=${userId} metadata.e2e=true`);
  return { id: userId, email, created: false };
}

export async function markE2eUser(
  admin: SupabaseClient,
  userId: string,
  extraMetadata?: Record<string, unknown>,
): Promise<void> {
  assertMutableTarget();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: mergeE2eMetadata(extraMetadata),
  });
  if (error) {
    throw new Error(`${LOG_PREFIX} mark e2e metadata failed: ${error.message}`);
  }
}

export async function destroyE2eUser(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  assertMutableTarget();
  console.log(
    `${LOG_PREFIX} destroy userId=${userId} order=public.users then auth.admin.deleteUser`,
  );

  const { error: dbError } = await admin.from('users').delete().eq('id', userId);
  if (dbError) {
    throw new Error(`${LOG_PREFIX} public.users delete failed: ${dbError.message}`);
  }

  const { error: authError } = await admin.auth.admin.deleteUser(userId);
  if (authError) {
    throw new Error(`${LOG_PREFIX} auth.admin.deleteUser failed: ${authError.message}`);
  }

  console.log(`${LOG_PREFIX} destroyed userId=${userId}`);
}

export async function withE2eUser<T>(
  admin: SupabaseClient,
  options: CreateE2eUserOptions,
  fn: (user: CreatedE2eUser) => Promise<T>,
): Promise<T> {
  const user = await createE2eUser(admin, options);
  try {
    return await fn(user);
  } finally {
    try {
      await destroyE2eUser(admin, user.id);
    } catch (cleanupError) {
      console.error(`${LOG_PREFIX} cleanup failed for userId=${user.id}`, cleanupError);
    }
  }
}

export function writeEphemeralUserRecord(user: { id: string; email: string }): void {
  mkdirSync(dirname(EPHEMERAL_USER_RECORD_PATH), { recursive: true });
  const record: EphemeralUserRecord = {
    userId: user.id,
    email: user.email,
    createdAt: new Date().toISOString(),
  };
  writeFileSync(EPHEMERAL_USER_RECORD_PATH, `${JSON.stringify(record)}\n`, 'utf8');
}

export function readEphemeralUserRecord(): EphemeralUserRecord | null {
  try {
    const raw = readFileSync(EPHEMERAL_USER_RECORD_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<EphemeralUserRecord>;
    if (typeof parsed.userId !== 'string' || !parsed.userId) return null;
    if (typeof parsed.email !== 'string') return null;
    return {
      userId: parsed.userId,
      email: parsed.email,
      createdAt: typeof parsed.createdAt === 'string' ? parsed.createdAt : '',
    };
  } catch {
    return null;
  }
}

export function clearEphemeralUserRecord(): void {
  try {
    unlinkSync(EPHEMERAL_USER_RECORD_PATH);
  } catch {
    /* already absent */
  }
}

export async function destroyEphemeralE2eUserIfPresent(
  admin: SupabaseClient,
): Promise<void> {
  const record = readEphemeralUserRecord();
  if (!record) {
    console.log(`${LOG_PREFIX} no ephemeral user record; skip destroy`);
    return;
  }

  const target = resolveE2eSupabaseTarget(supabaseUrlFromEnv());
  if (target.kind === 'production') {
    throw new Error(
      `${LOG_PREFIX} Refusing ephemeral destroy: target is production. Record left in place.`,
    );
  }
  if (isNonMutatingE2eTarget(target)) {
    console.log(`${LOG_PREFIX} skip ephemeral destroy; target is ${target.kind}`);
    return;
  }

  try {
    await destroyE2eUser(admin, record.userId);
  } finally {
    clearEphemeralUserRecord();
  }
}
