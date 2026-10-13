import type { CandidateSnapshotPrefetch } from '@/lib/candidate/load-snapshot'

export const SNAPSHOT_DB_READS = [
  'user',
  'progress',
  'interviews',
  'resumes',
  'enrollment',
  'recovery',
  'completedCount',
  'scriptReports',
  'campusOrg',
] as const

export type SnapshotDbRead = (typeof SNAPSHOT_DB_READS)[number]

/**
 * Which snapshot queries still hit the database given a prefetch bag.
 * Used by unit tests to lock the no-duplicate-read contract.
 */
export function listSnapshotDbReads(prefetch?: CandidateSnapshotPrefetch): SnapshotDbRead[] {
  const reads: SnapshotDbRead[] = []
  if (!prefetch || !('userRow' in prefetch)) reads.push('user')
  if (!prefetch || !('progressSnap' in prefetch)) reads.push('progress')
  if (!prefetch || !('interviews' in prefetch)) reads.push('interviews')
  if (!prefetch || !('resumes' in prefetch)) reads.push('resumes')
  if (!prefetch || !('enrollment' in prefetch)) reads.push('enrollment')
  if (!prefetch || !('recoveryTarget' in prefetch)) reads.push('recovery')
  if (!prefetch || !('completedSessionCount' in prefetch)) reads.push('completedCount')
  if (!prefetch || !('scriptReports' in prefetch)) reads.push('scriptReports')

  const hasCollegeName = Boolean(prefetch && 'collegeOrgName' in prefetch)
  if (!hasCollegeName) {
    const enrollment = prefetch && 'enrollment' in prefetch ? prefetch.enrollment : undefined
    const userRow = prefetch && 'userRow' in prefetch ? prefetch.userRow : undefined
    const orgId =
      (enrollment && typeof enrollment === 'object' && 'college_id' in enrollment
        ? (enrollment.college_id as string | null | undefined)
        : null) ??
      (userRow && typeof userRow === 'object' && 'campus_org_id' in userRow
        ? (userRow.campus_org_id as string | null | undefined)
        : null)
    if (orgId) reads.push('campusOrg')
    else if (!prefetch || !('enrollment' in prefetch) || !('userRow' in prefetch)) {
      // Org id is unknown until those rows load — snapshot may still query.
      reads.push('campusOrg')
    }
  }

  return reads
}
