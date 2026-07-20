import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fetchAutoStructureWithRetry } from './fetch-auto-structure'

describe('fetchAutoStructureWithRetry', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const body = {
    interviewId: '00000000-0000-0000-0000-000000000001',
    turnIndex: 3,
    rawTranscript: 'hello',
    displayQuestion: 'Q?',
    targetRole: 'SDE',
    scriptType: 'SCRIPT_M',
  }

  it('returns on first success without retrying', async () => {
    const structuredAnswer = {
      corrected_transcript: 'hello',
      coaching_reference: {
        feedback: 'Good',
        restructured_example: [],
        technical_terms: [],
        missing_elements: [],
      },
    }
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ structuredAnswer }),
    } as Response)

    const result = await fetchAutoStructureWithRetry(body)
    expect(result).toEqual(structuredAnswer)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('retries once after a failed attempt then succeeds', async () => {
    const structuredAnswer = {
      corrected_transcript: 'hello',
      coaching_reference: {
        feedback: 'Retry ok',
        restructured_example: [],
        technical_terms: [],
        missing_elements: [],
      },
    }
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, status: 504 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ structuredAnswer }),
      } as Response)

    const result = await fetchAutoStructureWithRetry(body)
    expect(result.coaching_reference.feedback).toBe('Retry ok')
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('throws after both attempts fail', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, status: 502 } as Response)
      .mockResolvedValueOnce({ ok: false, status: 502 } as Response)

    await expect(fetchAutoStructureWithRetry(body)).rejects.toThrow(/auto-structure 502/)
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
