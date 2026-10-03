import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  aggregateInterviewsByUser,
  interviewLastActivityAt,
  isIncompleteInterviewStatus,
  isPendingInterviewStatus,
} from '@/lib/admin/recent-user-interview-stats'

function row(
  user_id: string,
  status: string,
  started_at: string | null = '2026-09-24T08:00:00Z',
  completed_at: string | null = null,
) {
  return { user_id, status, started_at, completed_at }
}

describe('isIncompleteInterviewStatus', () => {
  it('includes pending, in_progress, and abandoned', () => {
    expect(isIncompleteInterviewStatus('pending')).toBe(true)
    expect(isIncompleteInterviewStatus('in_progress')).toBe(true)
    expect(isIncompleteInterviewStatus('abandoned')).toBe(true)
  })

  it('excludes completed and unknown statuses', () => {
    expect(isIncompleteInterviewStatus('completed')).toBe(false)
    expect(isIncompleteInterviewStatus('unknown')).toBe(false)
    expect(isIncompleteInterviewStatus('')).toBe(false)
  })

  it('keeps isPendingInterviewStatus as a compatibility alias', () => {
    expect(isPendingInterviewStatus('abandoned')).toBe(true)
    expect(isPendingInterviewStatus('completed')).toBe(false)
  })
})

describe('interviewLastActivityAt', () => {
  it('prefers started_at for completed interviews', () => {
    expect(
      interviewLastActivityAt({
        status: 'completed',
        started_at: '2026-09-01T10:00:00Z',
        completed_at: '2026-09-01T11:00:00Z',
      }),
    ).toBe('2026-09-01T10:00:00Z')
  })

  it('does not use abandoned.completed_at as last interview', () => {
    expect(
      interviewLastActivityAt({
        status: 'abandoned',
        started_at: '2026-09-24T08:00:00Z',
        completed_at: '2026-09-24T09:30:00Z',
      }),
    ).toBe('2026-09-24T08:00:00Z')
  })

  it('returns null for abandoned rows missing started_at', () => {
    expect(
      interviewLastActivityAt({
        status: 'abandoned',
        started_at: null,
        completed_at: '2026-09-24T09:30:00Z',
      }),
    ).toBeNull()
  })

  it('falls back to completed_at only for successful completions missing started_at', () => {
    expect(
      interviewLastActivityAt({
        status: 'completed',
        started_at: null,
        completed_at: '2026-09-01T11:00:00Z',
      }),
    ).toBe('2026-09-01T11:00:00Z')
  })
})

describe('aggregateInterviewsByUser', () => {
  it('no interviews → incomplete 0, completed 0', () => {
    const map = aggregateInterviewsByUser([])
    expect(map.size).toBe(0)
  })

  it('one pending → incomplete 1, completed 0', () => {
    const map = aggregateInterviewsByUser([row('u1', 'pending')])
    expect(map.get('u1')).toMatchObject({ total: 1, pending: 1, completed: 0 })
  })

  it('one in_progress → incomplete 1, completed 0', () => {
    const map = aggregateInterviewsByUser([row('u1', 'in_progress')])
    expect(map.get('u1')).toMatchObject({ total: 1, pending: 1, completed: 0 })
  })

  it('one abandoned with credit deducted context → incomplete 1 (status-only; no credit gate)', () => {
    // Aggregation is status-only; credit_deducted is not an input.
    const map = aggregateInterviewsByUser([
      row('u1', 'abandoned', '2026-09-24T08:00:00Z', '2026-09-24T09:30:00Z'),
    ])
    expect(map.get('u1')).toEqual({
      total: 1,
      pending: 1,
      completed: 0,
      lastAt: '2026-09-24T08:00:00Z',
    })
  })

  it('one abandoned without credit deduction → incomplete 1', () => {
    const map = aggregateInterviewsByUser([
      row('u1', 'abandoned', '2026-09-24T08:00:00Z', '2026-09-24T09:30:00Z'),
    ])
    expect(map.get('u1')).toMatchObject({ total: 1, pending: 1, completed: 0 })
  })

  it('one completed → incomplete 0, completed 1', () => {
    const map = aggregateInterviewsByUser([
      row('u1', 'completed', '2026-09-01T10:00:00Z', '2026-09-01T11:00:00Z'),
    ])
    expect(map.get('u1')).toEqual({
      total: 1,
      pending: 0,
      completed: 1,
      lastAt: '2026-09-01T10:00:00Z',
    })
  })

  it('one pending + one abandoned + one completed → incomplete 2, completed 1', () => {
    const map = aggregateInterviewsByUser([
      row('u1', 'pending', '2026-09-10T10:00:00Z', null),
      row('u1', 'abandoned', '2026-09-20T08:00:00Z', '2026-09-20T20:00:00Z'),
      row('u1', 'completed', '2026-09-22T10:00:00Z', '2026-09-22T11:00:00Z'),
    ])
    expect(map.get('u1')).toEqual({
      total: 3,
      pending: 2,
      completed: 1,
      lastAt: '2026-09-22T10:00:00Z',
    })
  })

  it('resumed interview now in_progress → incomplete 1 (current status only)', () => {
    // One row after resume transition — never double-count historical statuses.
    const map = aggregateInterviewsByUser([row('u1', 'in_progress')])
    expect(map.get('u1')).toMatchObject({ total: 1, pending: 1, completed: 0 })
  })

  it('multiple abandoned interviews → exact unique row count', () => {
    const map = aggregateInterviewsByUser([
      row('u1', 'abandoned', '2026-09-10T08:00:00Z', '2026-09-10T09:00:00Z'),
      row('u1', 'abandoned', '2026-09-12T08:00:00Z', '2026-09-12T09:00:00Z'),
      row('u1', 'abandoned', '2026-09-14T08:00:00Z', '2026-09-14T09:00:00Z'),
    ])
    expect(map.get('u1')).toMatchObject({ total: 3, pending: 3, completed: 0 })
  })

  it('unknown status increments total only', () => {
    const map = aggregateInterviewsByUser([row('u1', 'weird_status')])
    expect(map.get('u1')).toMatchObject({ total: 1, pending: 0, completed: 0 })
  })

  it('aggregates per user without cross-user leakage or join duplication', () => {
    const map = aggregateInterviewsByUser([
      row('u1', 'abandoned'),
      row('u2', 'completed', '2026-09-01T10:00:00Z', '2026-09-01T11:00:00Z'),
      row('u1', 'pending'),
    ])
    expect(map.get('u1')).toMatchObject({ total: 2, pending: 2, completed: 0 })
    expect(map.get('u2')).toMatchObject({ total: 1, pending: 0, completed: 1 })
  })

  it('Case D legacy: mixed completed + abandoned + in_progress', () => {
    const map = aggregateInterviewsByUser([
      {
        user_id: 'u1',
        status: 'completed',
        started_at: '2026-09-10T10:00:00Z',
        completed_at: '2026-09-10T11:00:00Z',
      },
      {
        user_id: 'u1',
        status: 'abandoned',
        started_at: '2026-09-20T08:00:00Z',
        completed_at: '2026-09-20T20:00:00Z',
      },
      {
        user_id: 'u1',
        status: 'in_progress',
        started_at: '2026-09-24T08:00:00Z',
        completed_at: null,
      },
    ])
    expect(map.get('u1')).toEqual({
      total: 3,
      pending: 2,
      completed: 1,
      lastAt: '2026-09-24T08:00:00Z',
    })
  })
})

describe('Admin Users API/UI contract', () => {
  it('recent-users route keeps pending_interviews field with incomplete semantics', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/app/api/admin/recent-users/route.ts'),
      'utf8',
    )
    expect(src).toContain('pending_interviews')
    expect(src).toContain("status IN ('pending', 'in_progress', 'abandoned')")
    expect(src).toContain('aggregateInterviewsByUser')
    // Date range filters users by join date; interviews are not date-filtered.
    expect(src).toContain('resolveUsersJoinPreset')
    expect(src).toMatch(/\.from\('interviews'\)[\s\S]*\.in\('user_id', userIds\)/)
  })

  it('analytics table labels Incomplete and binds pending_interviews', () => {
    const src = readFileSync(
      join(process.cwd(), 'src/app/platform/analytics/page.tsx'),
      'utf8',
    )
    expect(src).toContain('>Incomplete<')
    expect(src).toContain('u.pending_interviews')
    expect(src).not.toContain('>Pending<')
  })
})
