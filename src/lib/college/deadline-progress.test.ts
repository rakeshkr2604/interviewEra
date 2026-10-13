import { describe, expect, it } from 'vitest'
import { computeDeadlineProgress, studentMeetsDeadline } from './deadline-progress'

describe('campus deadline progress', () => {
  const progress = [
    { total_sessions: 3, current_tier: 2, overall_avg_score: 7.1 },
    { total_sessions: 1, current_tier: 1, overall_avg_score: 5 },
  ]

  it('evaluates sessions, tier, and score rules', () => {
    expect(studentMeetsDeadline(progress[0], 'sessions', 3)).toBe(true)
    expect(studentMeetsDeadline(progress[1], 'sessions', 3)).toBe(false)
    expect(studentMeetsDeadline(progress[0], 'tier', 2)).toBe(true)
    expect(studentMeetsDeadline(progress[1], 'score', 6)).toBe(false)
  })

  it('computes every deadline from one progress payload', () => {
    const now = new Date('2026-10-13T00:00:00.000Z')
    const rows = computeDeadlineProgress(
      [
        {
          id: 'd1',
          deadline_type: 'sessions',
          target_value: 3,
          due_date: '2026-10-20T00:00:00.000Z',
          description: null,
          mandatory: true,
          created_at: '2026-10-01T00:00:00.000Z',
        },
        {
          id: 'd2',
          deadline_type: 'score',
          target_value: 6,
          due_date: '2026-10-01T00:00:00.000Z',
          description: null,
          mandatory: false,
          created_at: '2026-09-01T00:00:00.000Z',
        },
      ],
      progress,
      2,
      now,
    )
    expect(rows[0]?.completedStudents).toBe(1)
    expect(rows[0]?.completionPercentage).toBe(50)
    expect(rows[0]?.isOverdue).toBe(false)
    expect(rows[1]?.completedStudents).toBe(1)
    expect(rows[1]?.isOverdue).toBe(true)
  })

  it('keeps empty-cohort math at zero instead of dividing by zero', () => {
    const rows = computeDeadlineProgress(
      [
        {
          id: 'd1',
          deadline_type: 'sessions',
          target_value: 1,
          due_date: '2026-10-20T00:00:00.000Z',
          description: null,
          mandatory: true,
          created_at: '2026-10-01T00:00:00.000Z',
        },
      ],
      [],
      0,
      new Date('2026-10-13T00:00:00.000Z'),
    )
    expect(rows[0]?.completedStudents).toBe(0)
    expect(rows[0]?.completionPercentage).toBe(0)
  })
})
