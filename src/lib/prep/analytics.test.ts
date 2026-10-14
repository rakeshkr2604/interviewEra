import { describe, expect, it, vi } from 'vitest'
import { copyText } from '@/lib/prep/copy-text'
import { sanitizePrepEventProps, trackPrepEvent } from '@/lib/prep/analytics'

describe('copyText', () => {
  it('copies when the clipboard API resolves', async () => {
    const writeText = vi.fn(async () => undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await expect(copyText('Hello coach')).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith('Hello coach')
    vi.unstubAllGlobals()
  })

  it('fails when the clipboard API rejects', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn(async () => Promise.reject(new Error('denied'))) },
    })
    await expect(copyText('Hello coach')).resolves.toBe('failed')
    vi.unstubAllGlobals()
  })

  it('fails when clipboard is missing', async () => {
    vi.stubGlobal('navigator', {})
    await expect(copyText('Hello coach')).resolves.toBe('failed')
    vi.unstubAllGlobals()
  })
})

describe('sanitizePrepEventProps', () => {
  it('drops resume text and other free-text fields', () => {
    const safe = sanitizePrepEventProps({
      goal: 'hr',
      level: 'fresher',
      has_resume: true,
      page_path: '/prepare',
      ...({
        resume_text: 'secret resume body that must never be sent',
        prompt: 'full generated prompt',
        job_description: 'pasted JD',
      } as object),
    })
    expect(safe).toEqual({
      goal: 'hr',
      level: 'fresher',
      has_resume: true,
      page_path: '/prepare',
    })
    expect(JSON.stringify(safe)).not.toContain('secret')
  })

  it('drops oversized strings', () => {
    const safe = sanitizePrepEventProps({ section: 'x'.repeat(81) })
    expect(safe.section).toBeUndefined()
  })
})

describe('trackPrepEvent', () => {
  it('does not throw when window is undefined', () => {
    expect(() => trackPrepEvent('prep_prompt_generated', { goal: 'technical', has_resume: false })).not.toThrow()
  })
})
