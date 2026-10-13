import { describe, expect, it } from 'vitest'
import { chunkIds } from './id-chunks'

describe('chunkIds', () => {
  it('returns empty for empty input', () => {
    expect(chunkIds([])).toEqual([])
  })

  it('chunks large id lists and keeps leftovers', () => {
    const ids = Array.from({ length: 205 }, (_, i) => `id-${i}`)
    const chunks = chunkIds(ids, 100)
    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toHaveLength(100)
    expect(chunks[2]).toHaveLength(5)
    expect(chunks.flat()).toEqual(ids)
  })
})
