/**
 * Auth V2 — pure post-auth destination resolution (safe for client imports).
 */

import type { AuthIntent } from '@/lib/auth/auth-intent';
import { isSafePath, sanitizeNext } from '@/lib/auth/auth-params';

export interface ResolveDestinationParams {
  next?: string | null;
  intent?: AuthIntent;
  inviteToken?: string | null;
}

/**
 * Pure tier + params resolution (no I/O). Use when plan_tier is already loaded.
 */
export function resolveDestinationFromTier(
  planTier: string | null | undefined,
  params: ResolveDestinationParams = {},
): string {
  if (isSafePath(params.next)) {
    return params.next;
  }

  if (params.inviteToken && params.inviteToken.length > 0) {
    const invitePath = `/college/join/${params.inviteToken}`;
    if (isSafePath(invitePath)) {
      return invitePath;
    }
  }

  if (planTier === 'campus_admin') {
    return '/college/dashboard';
  }

  return sanitizeNext(null);
}

/**
 * Extract invite token from a safe next path like /college/join/{token}.
 */
export function extractInviteTokenFromNext(next: string | null | undefined): string | undefined {
  if (!isSafePath(next)) return undefined;
  const match = /^\/college\/join\/([^/]+)$/.exec(next);
  return match?.[1];
}
