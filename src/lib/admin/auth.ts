/**
 * Platform-admin authorization helpers.
 *
 * "Platform admin" = a user whose email is listed in the ADMIN_EMAILS env var.
 * This is separate from "campus admin" (plan_tier = 'campus_admin'), which is
 * the B2B role for T&P officers.
 *
 * Usage in API routes:
 *   const { admin, error } = await requirePlatformAdmin();
 *   if (error) return error;           // 401 or 403 NextResponse
 *   // admin.id / admin.email available
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface PlatformAdmin {
  id: string;
  email: string;
}

export type AdminResult =
  | { admin: PlatformAdmin; error: null }
  | { admin: null; error: NextResponse };

function getPlatformAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(
    raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
}

export function isPlatformAdmin(email: string): boolean {
  return getPlatformAdminEmails().has(email.toLowerCase());
}

export async function requirePlatformAdmin(): Promise<AdminResult> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user || !user.email) {
    return { admin: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!isPlatformAdmin(user.email)) {
    return { admin: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { admin: { id: user.id, email: user.email }, error: null };
}
