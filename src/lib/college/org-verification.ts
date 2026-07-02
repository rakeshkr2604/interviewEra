/**
 * Campus workspace verification — prevents self-service campus_admin escalation.
 */

export type CampusOrgVerificationStatus = 'pending' | 'approved';

/** Dev/staging auto-approve or comma-separated pilot email allowlist. */
export function shouldAutoApproveCampusOrg(email: string | undefined): boolean {
  if (process.env.CAMPUS_WORKSPACE_AUTO_APPROVE === 'true') {
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
