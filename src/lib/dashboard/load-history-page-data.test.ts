import { describe, expect, it } from 'vitest'
import { mapHistoryItems } from './load-history-page-data'

describe('mapHistoryItems', () => {
  it('maps script and v1 reports onto the matching interview only', () => {
    const items = mapHistoryItems(
      [
        {
          id: 'script-1',
          role: 'SWE',
          difficulty: 'medium',
          status: 'completed',
          started_at: '2026-10-01T10:00:00.000Z',
          completed_at: '2026-10-01T10:30:00.000Z',
          engine: 'v2.1',
          abandoned_resume_used: false,
          credit_deducted: true,
        },
        {
          id: 'v1-1',
          role: 'SWE',
          difficulty: 'easy',
          status: 'completed',
          started_at: '2026-09-01T10:00:00.000Z',
          completed_at: '2026-09-01T10:30:00.000Z',
          engine: 'v1',
          abandoned_resume_used: false,
          credit_deducted: true,
        },
      ],
      [{ id: 'rep-v1', interview_id: 'v1-1', overall_score: 8.2 }],
      [{ id: 'rep-script', interview_id: 'script-1', overall: 7.4, status: 'ready' }],
    )

    expect(items[0]).toMatchObject({
      id: 'script-1',
      score: 7.4,
      reportHref: '/report/script/script-1',
      continueHref: '/interview/script/script-1',
    })
    expect(items[1]).toMatchObject({
      id: 'v1-1',
      score: 8.2,
      reportHref: '/report/rep-v1',
    })
  })

  it('ignores incomplete script reports and empty datasets', () => {
    expect(mapHistoryItems([], [], [])).toEqual([])
    const items = mapHistoryItems(
      [
        {
          id: 'script-2',
          role: 'SWE',
          difficulty: 'medium',
          status: 'completed',
          started_at: null,
          completed_at: null,
          engine: 'v2.1',
          abandoned_resume_used: false,
          credit_deducted: true,
        },
      ],
      [],
      [{ id: 'pending', interview_id: 'script-2', overall: null, status: 'generating' }],
    )
    expect(items[0]?.score).toBeNull()
    expect(items[0]?.reportHref).toBe('/report/script/script-2')
  })
})

describe('history list ordering contract', () => {
  it('keeps a secondary id order so equal timestamps stay stable across pages', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const source = readFileSync(
      join(process.cwd(), 'src/lib/dashboard/load-history-page-data.ts'),
      'utf8',
    )
    expect(source).toContain(".order('started_at', { ascending: false, nullsFirst: false })")
    expect(source).toContain(".order('id', { ascending: false })")
  })
})
