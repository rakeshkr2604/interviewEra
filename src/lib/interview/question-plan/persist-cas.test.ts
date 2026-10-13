import { describe, expect, it, vi } from 'vitest'
import { markQuestionPlanRows } from './persist'

describe('markQuestionPlanRows concurrency contract', () => {
  it('updates each row with a planned-status compare-and-swap, not a bulk write', async () => {
    const updates: Array<{ id: string; filter: string }> = []
    let currentId = ''
    const builder = {
      eq: vi.fn((column: string, value: string) => {
        if (column === 'id') {
          currentId = value
          return builder
        }
        if (column === 'plan_status') {
          updates.push({ id: currentId, filter: value })
        }
        return Promise.resolve({ error: null })
      }),
    }
    const client = {
      from: () => ({
        update: () => builder,
      }),
    }

    await markQuestionPlanRows(client as never, [
      { id: 'q1', status: 'asked' },
      { id: 'q2', status: 'skipped' },
    ])

    expect(updates).toEqual([
      { id: 'q1', filter: 'planned' },
      { id: 'q2', filter: 'planned' },
    ])
    expect(builder.eq).toHaveBeenCalledTimes(4)
  })
})
