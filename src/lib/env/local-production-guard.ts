/**
 * Fail-closed guard for local `next dev` / `next build` / `next start` (wired in next.config.ts).
 *
 * Local processes must never reach production Supabase or take live Razorpay payments.
 * Skipped on Vercel and CI, whose environments are managed separately, so production
 * deployments are unaffected. Errors name the variable only, never its value.
 */

import { PRODUCTION_SUPABASE_PROJECT_REF } from './staging-environment';

type Env = Record<string, string | undefined>;

const SUPABASE_KEY_NAMES = ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
const RAZORPAY_KEY_NAMES = ['RAZORPAY_KEY_ID', 'NEXT_PUBLIC_RAZORPAY_KEY_ID'] as const;

/** Project ref from a legacy Supabase JWT key; null for non-JWT or unparseable values. */
function jwtProjectRef(token: string): string | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const claims: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const ref = (claims as { ref?: unknown } | null)?.ref;
    return typeof ref === 'string' ? ref.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function findLocalProductionTargets(env: Env): string[] {
  if (env.VERCEL?.trim() || env.VERCEL_ENV?.trim() || env.CI?.trim()) return [];

  const found: string[] = [];
  if (env.NEXT_PUBLIC_SUPABASE_URL?.toLowerCase().includes(PRODUCTION_SUPABASE_PROJECT_REF)) {
    found.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  for (const name of SUPABASE_KEY_NAMES) {
    if (jwtProjectRef(env[name]?.trim() ?? '') === PRODUCTION_SUPABASE_PROJECT_REF) found.push(name);
  }
  for (const name of RAZORPAY_KEY_NAMES) {
    if (env[name]?.trim().startsWith('rzp_live_')) found.push(name);
  }
  return found;
}

export function assertNotLocalProductionTarget(env: Env = process.env): void {
  const found = findLocalProductionTargets(env);
  if (found.length > 0) {
    throw new Error(
      `[env-guard] Refusing to start: ${found.join(', ')} target production. ` +
        'Local runs must use staging or placeholder credentials.',
    );
  }
}
