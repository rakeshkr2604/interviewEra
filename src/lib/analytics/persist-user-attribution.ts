/**
 * Server-side helper: persist anonymous attribution against an authenticated
 * public.users row at the auth boundary.
 *
 * First-touch semantics:
 *   - first_touch_attribution is a DB snapshot: NULL → first valid attribution.
 *   - Once non-null it is immutable. The UPDATE WHERE clause enforces this atomically.
 *   - No client-side slot-filling; the whole record is written or not.
 *
 * Latest-touch semantics:
 *   - latest_touch_attribution is always overwritten with valid incoming attribution.
 *
 * The helper never throws to callers. Failures are logged with the project prefix
 * and swallowed so that auth flows are never blocked.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  type Attribution,
  hasAttribution,
  normalizeAttribution,
} from '@/lib/analytics/attribution';

/**
 * Persist normalized attribution for an authenticated user.
 *
 * @param svc      - Service-role Supabase client (never anon/user-scoped).
 * @param userId   - Verified server-side user ID from Supabase auth result.
 * @param incoming - Raw attribution resolved from request (cookie / headers).
 */
export async function persistUserAttributionOnce(
  svc: SupabaseClient,
  userId: string,
  incoming: Attribution,
): Promise<void> {
  const normalized = normalizeAttribution(incoming);

  if (!hasAttribution(normalized)) {
    return;
  }

  try {
    // Atomic first-touch: only writes when the column is still NULL.
    // Concurrent requests for the same user ID will have exactly one winner.
    const { error: firstTouchError } = await svc
      .from('users')
      .update({ first_touch_attribution: normalized })
      .eq('id', userId)
      .is('first_touch_attribution', null);

    if (firstTouchError) {
      console.error('[attribution] first_touch_attribution update failed:', {
        userId,
        error: firstTouchError.message,
      });
    }

    // Latest-touch: unconditional overwrite.
    const { error: latestTouchError } = await svc
      .from('users')
      .update({ latest_touch_attribution: normalized })
      .eq('id', userId);

    if (latestTouchError) {
      console.error('[attribution] latest_touch_attribution update failed:', {
        userId,
        error: latestTouchError.message,
      });
    }
  } catch (err) {
    console.error('[attribution] persistUserAttributionOnce unexpected failure:', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
