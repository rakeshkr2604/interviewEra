import { describe, expect, it } from 'vitest'
import { listSnapshotDbReads } from './snapshot-query-plan'

describe('listSnapshotDbReads', () => {
  it('lists the full snapshot query set when nothing is prefetched', () => {
    expect(listSnapshotDbReads()).toEqual([
      'user',
      'progress',
      'interviews',
      'resumes',
      'enrollment',
      'recovery',
      'completedCount',
      'scriptReports',
      'campusOrg',
    ])
  })

  it('skips every dashboard-prefetched read including a null college name', () => {
    expect(
      listSnapshotDbReads({
        userRow: { campus_org_id: null },
        progressSnap: null,
        interviews: [],
        recoveryTarget: null,
        completedSessionCount: 4,
        resumes: [],
        enrollment: null,
        scriptReports: [],
        collegeOrgName: null,
      }),
    ).toEqual([])
  })

  it('does not re-query script reports when they were already loaded for the interview window', () => {
    const reads = listSnapshotDbReads({
      userRow: { campus_org_id: null },
      progressSnap: null,
      interviews: [{ id: 'i1', role: 'SWE', status: 'completed' }],
      recoveryTarget: null,
      completedSessionCount: 1,
      resumes: [],
      enrollment: null,
      scriptReports: [
        {
          id: 'r1',
          interview_id: 'i1',
          overall: 7.2,
          dimension_averages: null,
          generated_at: '2026-10-01T00:00:00.000Z',
          status: 'ready',
        },
      ],
      collegeOrgName: null,
    })
    expect(reads).not.toContain('scriptReports')
    expect(reads).not.toContain('interviews')
  })
})
