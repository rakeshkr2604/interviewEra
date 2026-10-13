/**
 * Password-login destination resolution after Supabase auth succeeds.
 * Separates plan-tier routing from optional hiring-org enrichment so callers can
 * skip or parallelize I/O without changing product rules.
 */

import {
  extractInviteTokenFromNext,
  resolveDestinationFromTier,
} from '@/lib/auth/resolve-destination-core';

export type PasswordLoginLookups = {
  planTier: string | null | undefined;
  /** Present only when hiring-org lookup ran (or null when it ran and found none). */
  hiringOrgId?: string | null;
};

/**
 * Hiring-org override applies only when the user did not supply an explicit
 * non-dashboard `next` (historical LoginForm contract).
 */
export function shouldLookupHiringOrganization(next?: string | null): boolean {
  return !next || next === '/dashboard';
}

export function resolvePasswordLoginDestination(
  next: string | null | undefined,
  lookups: PasswordLoginLookups,
): string {
  const inviteToken = extractInviteTokenFromNext(next);
  let destination = resolveDestinationFromTier(lookups.planTier, {
    next,
    inviteToken,
  });

  if (shouldLookupHiringOrganization(next) && lookups.hiringOrgId) {
    destination = '/hiring/dashboard';
  }

  return destination;
}
