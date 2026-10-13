import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  DASHBOARD_LAYOUT_QUERY_UNITS,
  DASHBOARD_WAVE1_QUERY_UNITS,
  DASHBOARD_WAVE2_QUERY_UNITS,
  describeDashboardRequestPlan,
} from './request-plan'

describe('dashboard request plan', () => {
  it('keeps layout work on the TTFB path and snapshot empty after prefetch', () => {
    const plan = describeDashboardRequestPlan()
    expect(plan.ttfbBlocking).toEqual([...DASHBOARD_LAYOUT_QUERY_UNITS])
    expect(plan.wave1).toContain('interviews.recent20')
    expect(plan.wave1).toContain('recovery.active')
    expect(plan.wave2).toContain('script_interview_reports')
    expect(plan.snapshotAfterPrefetch).toEqual([])
  })

  it('documents wave-1 cache reuse of layout user/progress rows', () => {
    expect(DASHBOARD_WAVE1_QUERY_UNITS).toContain('users.cached')
    expect(DASHBOARD_WAVE1_QUERY_UNITS).toContain('user_progress.cached')
    expect(DASHBOARD_WAVE2_QUERY_UNITS).not.toContain('users')
  })

  it('wires gated spans into layout and the two-wave loader', () => {
    const root = process.cwd()
    const layout = readFileSync(join(root, 'src/app/(dashboard)/layout.tsx'), 'utf8')
    const loader = readFileSync(
      join(root, 'src/lib/dashboard/load-dashboard-page-data.ts'),
      'utf8',
    )
    expect(layout).toContain('timedDashboardSpan')
    expect(layout).toContain('layout.chrome')
    expect(loader).toContain("dashboardPerfMark('wave1'")
    expect(loader).toContain("dashboardPerfMark('wave2'")
    expect(loader).toContain("dashboardPerfMark('snapshot.assemble'")
  })
})
