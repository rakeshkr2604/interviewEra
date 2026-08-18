/**
 * Campus workspace verification — prevents self-service campus_admin escalation.
 */

export type CampusOrgVerificationStatus = 'pending' | 'approved' | 'rejected';

/**
 * True only on Vercel Production (`VERCEL_ENV=production`).
 * Preview / local / unset VERCEL_ENV are not production — auto-approve may still apply there.
 * Do not use NODE_ENV: it is `production` for `next start` and Vercel previews too.
 */
function isVercelProduction(): boolean {
  return process.env.VERCEL_ENV === 'production';
}

/** Dev/staging auto-approve or comma-separated pilot email allowlist. */
export function shouldAutoApproveCampusOrg(email: string | undefined): boolean {
  // Blanket auto-approve is impossible in Vercel Production even if the env var is set.
  if (
    !isVercelProduction() &&
    process.env.CAMPUS_WORKSPACE_AUTO_APPROVE === 'true'
  ) {
    return true;
  }

  const raw = process.env.CAMPUS_ORG_APPROVED_EMAILS;
  if (!raw?.trim() || !email) {
    return false;
  }

  const normalized = email.trim().toLowerCase();
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .includes(normalized);
}

export function resolveCampusOrgVerificationStatus(
  email: string | undefined,
): CampusOrgVerificationStatus {
  return shouldAutoApproveCampusOrg(email) ? 'approved' : 'pending';
}
