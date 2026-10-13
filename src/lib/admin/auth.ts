/**
 * Platform-admin authorization helpers.
 */

import { cache } from 'react';
import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export interface PlatformAdmin {
  id: string;
  email: string;
}

export type AdminResult =
  | { admin: PlatformAdmin; error: null }
  | { admin: null; error: NextResponse };

/**
 * Always-allowed founder accounts (in addition to ADMIN_EMAILS / platform_role).
 * Keeps solo-founder workspace switching working even if env is missing on a host.
 */
export const BUILTIN_PLATFORM_ADMIN_EMAILS = ['rakesh.kr2604@gmail.com'] as const;

function getPlatformAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  const fromEnv = raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return new Set([...fromEnv, ...BUILTIN_PLATFORM_ADMIN_EMAILS.map((e) => e.toLowerCase())]);
}

export function isPlatformAdmin(email: string): boolean {
  return getPlatformAdminEmails().has(email.toLowerCase());
}

async function isPlatformRoleAdmin(userId: string): Promise<boolean> {
  try {
    const svc = createServiceClient();
    const { data: profile } = await svc
      .from('users')
      .select('platform_role')
      .eq('id', userId)
      .single();
    return profile?.platform_role === 'admin';
  } catch {
    return false;
  }
}

/** Request-scoped verified user (auth.getUser). Never caches across requests. */
export const getVerifiedPlatformUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;
  return user;
});

/** True when user is in ADMIN_EMAILS / builtin founder list or has platform_role = admin. */
export async function isPlatformAdminUser(
  userId: string,
  email: string | null | undefined,
): Promise<boolean> {
  if (email && isPlatformAdmin(email)) return true;
  return isPlatformRoleAdmin(userId);
}

/**
 * Admin gate for API routes and RSC. Uses request-scoped getVerifiedPlatformUser
 * so layout + nested reads share one auth.getUser. Authorization still runs on
 * every protected API call — a layout check alone is never enough.
 */
export async function requirePlatformAdmin(): Promise<AdminResult> {
  const user = await getVerifiedPlatformUser();

  if (!user || !user.email) {
    return { admin: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const allowed = await isPlatformAdminUser(user.id, user.email);

  if (!allowed) {
    return { admin: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { admin: { id: user.id, email: user.email }, error: null };
}
