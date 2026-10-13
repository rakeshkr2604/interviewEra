import { describe, expect, it } from 'vitest'
import {
  fetchCompletedInterviewCount,
  fetchRecentCompletedInterviewIds,
} from './completed-interviews'

function createCompletedClient(options: {
  count?: number
  rows?: { id: string }[]
}) {
  const calls: Array<{ count?: string; head?: boolean; limit?: number }> = []
  const client = {
    from: (table: string) => {
      expect(table).toBe('interviews')
      const api = {
        select: (_columns: string, opts?: { count?: 'exact'; head?: boolean }) => {
          calls.push({ count: opts?.count, head: opts?.head })
          return api
        },
        eq: () => api,
        order: () => api,
        limit: (n: number) => {
          calls.push({ limit: n })
          return Promise.resolve({ data: options.rows ?? [], error: null, count: options.count })
        },
        then: (
          resolve: (value: { data: { id: string }[] | null; error: null; count: number | null }) => unknown,
        ) =>
          Promise.resolve({
            data: options.rows ?? [],
            error: null,
            count: options.count ?? null,
          }).then(resolve),
      }
      return api
    },
  }
  return { client, calls }
}

describe('completed interview helpers', () => {
  it('uses an exact head count for lifetime totals', async () => {
    const { client, calls } = createCompletedClient({ count: 42, rows: [] })
    await expect(fetchCompletedInterviewCount(client, 'user-1')).resolves.toBe(42)
    expect(calls.some((call) => call.count === 'exact' && call.head)).toBe(true)
  })

  it('bounds recent ids and degrades to [] on query failure', async () => {
    const ok = createCompletedClient({
      rows: [{ id: 'a' }, { id: 'b' }],
    })
    await expect(fetchRecentCompletedInterviewIds(ok.client, 'user-1', 20)).resolves.toEqual([
      'a',
      'b',
    ])
    expect(ok.calls.some((call) => call.limit === 20)).toBe(true)

    const failing = {
      from: () => ({
        select: () => failing.from(),
        eq: () => failing.from(),
        order: () => failing.from(),
        limit: () => Promise.resolve({ data: null, error: { message: 'boom' } }),
      }),
    }
    const spy = { error: (..._args: unknown[]) => undefined }
    const original = console.error
    console.error = spy.error
    await expect(fetchRecentCompletedInterviewIds(failing, 'user-1')).resolves.toEqual([])
    console.error = original
  })
})
