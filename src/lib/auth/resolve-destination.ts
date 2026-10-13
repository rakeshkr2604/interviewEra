/**
 * Auth V2 — server-side post-auth destination resolver (DB lookup).
 */

import 'server-only';

import { createServiceClient } from '@/lib/supabase/server';
import { isSafePath } from '@/lib/auth/auth-params';
import {
  resolveDestinationFromTier,
  type ResolveDestinationParams,
} from '@/lib/auth/resolve-destination-core';

export type { ResolveDestinationParams } from '@/lib/auth/resolve-destination-core';
export {
  extractInviteTokenFromNext,
  resolveDestinationFromTier,
} from '@/lib/auth/resolve-destination-core';

/**
 * Resolve where to send the user after a successful auth session is established.
 */
export async function resolvePostAuthDestination(
  userId: string,
  params: ResolveDestinationParams = {},
): Promise<string> {
  if (isSafePath(params.next)) {
    return params.next;
  }

  if (params.inviteToken && params.inviteToken.length > 0) {
    const invitePath = `/college/join/${params.inviteToken}`;
    if (isSafePath(invitePath)) {
      return invitePath;
    }
  }

  const service = createServiceClient();
  const [profileResult, hiringResult] = await Promise.all([
    service.from('users').select('plan_tier').eq('id', userId).single(),
    service
      .from('hiring_organizations')
      .select('id')
      .eq('admin_user_id', userId)
      .maybeSingle(),
  ]);

  const planTier = profileResult.data?.plan_tier;
  if (planTier === 'campus_admin') {
    return '/college/dashboard';
  }

  if (hiringResult.data) {
    return '/hiring/dashboard';
  }

  return resolveDestinationFromTier(planTier, params);
}
