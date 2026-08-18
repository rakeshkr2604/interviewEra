import type { SupabaseClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';
import { FREE_PLAN } from '@/lib/pricing/plans';

/**
 * Ensures `public.users` has a row for this auth user. Production can see FK failures on
 * `resumes.user_id` when auth.users exists but the trigger never ran (imported user,
 * failed migration, or trigger disabled in a forked DB).
 */
export async function ensurePublicUserRow(
  admin: SupabaseClient,
  user: User,
): Promise<{ ok: true } | { ok: false; message: string; code?: string }> {
  const { data: existing, error: selErr } = await admin
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (selErr) {
    return { ok: false, message: selErr.message, code: selErr.code };
  }
  if (existing) {
    return { ok: true };
  }

  const email = user.email?.trim();
  if (!email) {
    return {
      ok: false,
      message: 'Cannot create profile: authenticated user has no email.',
      code: 'NO_EMAIL',
    };
  }

  const rawName = user.user_metadata?.['name'];
  const name = typeof rawName === 'string' && rawName.trim().length > 0 ? rawName.trim() : null;

  const { error: insErr } = await admin.from('users').insert({
    id: user.id,
    email,
    name,
    plan_tier: 'free',
    credits_remaining: FREE_PLAN.credits,
  });

  if (insErr) {
    if (insErr.code === '23505') {
      const { data: raced, error: raceSel } = await admin
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      if (!raceSel && raced) {
        return { ok: true };
      }
    }
    return { ok: false, message: insErr.message, code: insErr.code };
  }

  return { ok: true };
}
