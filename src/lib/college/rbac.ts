import type { CampusPermission, CampusRole } from './types';

const ROLE_PERMISSIONS: Record<CampusRole, CampusPermission[]> = {
  campus_admin: [
    'students:read',
    'students:write',
    'invites:manage',
    'analytics:read',
    'deadlines:manage',
    'settings:write',
  ],
  placement_officer: [
    'students:read',
    'students:write',
    'invites:manage',
    'analytics:read',
    'deadlines:manage',
    'settings:write',
  ],
  recruiter: ['students:read', 'analytics:read'],
};

/** Map plan_tier to campus role until dedicated campus_role column exists. */
export function resolveCampusRole(planTier: string | null | undefined): CampusRole | null {
  if (planTier === 'campus_admin') return 'campus_admin';
  return null;
}

export function hasCampusPermission(role: CampusRole, permission: CampusPermission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function canAccessCampusDashboard(planTier: string | null | undefined): boolean {
  return resolveCampusRole(planTier) !== null;
}
