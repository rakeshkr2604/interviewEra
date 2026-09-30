import { describe, expect, it } from 'vitest'
import {
  aggregateInterviewsByUser,
  interviewLastActivityAt,
} from '@/lib/admin/recent-user-interview-stats'

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
  it('Case A: completed interview → completed = 1', () => {
    const map = aggregateInterviewsByUser([
      {
        user_id: 'u1',
        status: 'completed',
        started_at: '2026-09-01T10:00:00Z',
        completed_at: '2026-09-01T11:00:00Z',
      },
    ])
    expect(map.get('u1')).toEqual({
      total: 1,
      pending: 0,
      completed: 1,
      lastAt: '2026-09-01T10:00:00Z',
    })
  })

  it('Case B: abandoned → completed = 0; lastAt from started_at not abandoned.completed_at', () => {
    const map = aggregateInterviewsByUser([
      {
        user_id: 'u1',
        status: 'abandoned',
        started_at: '2026-09-24T08:00:00Z',
        completed_at: '2026-09-24T23:59:00Z',
      },
    ])
    expect(map.get('u1')).toEqual({
      total: 1,
      pending: 0,
      completed: 0,
      lastAt: '2026-09-24T08:00:00Z',
    })
  })

  it('Case C: in_progress → pending = 1, completed = 0', () => {
    const map = aggregateInterviewsByUser([
      {
        user_id: 'u1',
        status: 'in_progress',
        started_at: '2026-09-24T08:00:00Z',
        completed_at: null,
      },
    ])
    expect(map.get('u1')).toEqual({
      total: 1,
      pending: 1,
      completed: 0,
      lastAt: '2026-09-24T08:00:00Z',
    })
  })

  it('Case D: mixed completed + abandoned + in_progress', () => {
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
      pending: 1,
      completed: 1,
      lastAt: '2026-09-24T08:00:00Z',
    })
  })
})
