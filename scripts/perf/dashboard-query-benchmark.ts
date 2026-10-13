/**
 * Repeatable dashboard query-plan benchmark (no live credentials required).
 *
 * Prints the snapshot DB-read set before/after prefetch so CI can lock the
 * no-duplicate-read contract. Live timings belong in docs/performance/.
 *
 *   npx tsx scripts/perf/dashboard-query-benchmark.ts
 */
import { describeDashboardRequestPlan } from '../../src/lib/dashboard/request-plan'
import { listSnapshotDbReads } from '../../src/lib/dashboard/snapshot-query-plan'

const before = listSnapshotDbReads()
const after = listSnapshotDbReads({
  userRow: { campus_org_id: null },
  progressSnap: null,
  interviews: [],
  recoveryTarget: null,
  completedSessionCount: 0,
  resumes: [],
  enrollment: null,
  scriptReports: [],
  collegeOrgName: null,
})

const payload = {
  measuredAt: new Date().toISOString(),
  baselineCommitNote:
    'Counts are query-plan units, not wall-clock. Live timings need an authenticated session.',
  requestPlan: describeDashboardRequestPlan(),
  snapshotReadsWithoutPrefetch: before,
  snapshotReadsWithDashboardPrefetch: after,
  avoidedReads: before.filter((read) => !after.includes(read)),
}

process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
