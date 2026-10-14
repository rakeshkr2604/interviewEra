import { describe, expect, it } from 'vitest'
import { parsePromptBuilderUsage } from '@/lib/prep/usage-event'

describe('parsePromptBuilderUsage', () => {
  it('accepts a preparation goal and nothing else', () => {
    expect(parsePromptBuilderUsage({ goal: 'technical' })).toEqual({ goal: 'technical' })
  })

  it('rejects resume text, prompts, and unknown fields', () => {
    expect(
      parsePromptBuilderUsage({
        goal: 'hr',
        resumeText: 'secret resume',
        prompt: 'full prompt',
        jobDescription: 'pasted JD',
      }),
    ).toBeNull()
    expect(parsePromptBuilderUsage({ goal: 'not-a-goal' })).toBeNull()
    expect(parsePromptBuilderUsage(null)).toBeNull()
  })
})
