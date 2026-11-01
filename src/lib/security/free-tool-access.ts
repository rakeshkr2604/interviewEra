import 'server-only';

/**
 * Server-side access boundary for the interactive free tools.
 *
 * Identity comes from `supabase.auth.getUser()` (token verified by Supabase Auth),
 * never from cookie presence. Call this BEFORE validation-heavy parsing, rate-limit
 * consumption or any AI spend.
 */

import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/supabase/session';
import { hasVerifiedEmail } from '@/lib/auth/verified-email-policy';
import { isPaidPlanActive } from '@/lib/pricing/plan-status';
import type { FreeToolLimitTier } from '@/lib/security/free-tool-rate-limit';

export type FreeToolAuthErrorCode = 'AUTH_REQUIRED' | 'EMAIL_UNVERIFIED' | 'AUTH_UNAVAILABLE';

export type FreeToolAccess =
  | { ok: true; userId: string; tier: FreeToolLimitTier }
  | { ok: false; code: FreeToolAuthErrorCode; message: string; status: 401 | 403 | 503 };

export const FREE_TOOL_AUTH_MESSAGES: Record<FreeToolAuthErrorCode, string> = {
  AUTH_REQUIRED: 'Create a free InterviewEra account or sign in to use this tool.',
  EMAIL_UNVERIFIED: 'Please verify your email address to use the free tools.',
  AUTH_UNAVAILABLE: 'We could not confirm your sign-in right now. Please retry in a moment.',
};

function deny(code: FreeToolAuthErrorCode): FreeToolAccess {
  const status = code === 'AUTH_REQUIRED' ? 401 : code === 'EMAIL_UNVERIFIED' ? 403 : 503;
  return { ok: false, code, message: FREE_TOOL_AUTH_MESSAGES[code], status };
}

export function resolveFreeToolTier(
  row: { plan_tier?: string | null; plan_status?: string | null; plan_expires_at?: string | null } | null,
): FreeToolLimitTier {
  if (!row?.plan_tier) return 'free';
  if (row.plan_tier === 'campus' || row.plan_tier === 'campus_admin') return 'paid';
  return isPaidPlanActive(row.plan_tier, row.plan_status, row.plan_expires_at) ? 'paid' : 'free';
}

export async function requireFreeToolUser(): Promise<FreeToolAccess> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return deny('AUTH_UNAVAILABLE');
  }

  let user: Awaited<ReturnType<typeof getServerUser>>;
  try {
    user = await getServerUser(supabase);
  } catch {
    return deny('AUTH_UNAVAILABLE');
  }
  if (!user) return deny('AUTH_REQUIRED');
  if (!hasVerifiedEmail(user)) return deny('EMAIL_UNVERIFIED');

  // Tier only widens fair-use limits; on lookup failure fall back to the stricter Free tier.
  let tier: FreeToolLimitTier = 'free';
  try {
    const { data } = await supabase
      .from('users')
      .select('plan_tier, plan_status, plan_expires_at')
      .eq('id', user.id)
      .maybeSingle();
    tier = resolveFreeToolTier(data);
  } catch {
    tier = 'free';
  }

  return { ok: true, userId: user.id, tier };
}

export function clientIpFromHeaders(headersList: Headers): string {
  return (
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip')?.trim() ||
    'unknown'
  );
}
