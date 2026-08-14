import { describe, expect, it } from 'vitest'
import { normalizeAutoStructureOutput } from './normalize'
import {
  AUTO_STRUCTURE_PROMPT_VERSION,
  AUTO_STRUCTURE_SYSTEM,
  buildAutoStructureUserPrompt,
  resolveAutoStructureMaxTokens,
} from './prompt'
import { getTokenBudget } from '@/lib/ai/token-budget'
import { getOperationSpec } from '@/lib/ai/operation-registry'

describe('auto-structure normalize', () => {
  it('1: normal answer keeps corrected + coaching fields', () => {
    const out = normalizeAutoStructureOutput(
      {
        corrected_transcript: 'I used Supabase for auth',
        coaching_reference: {
          feedback: 'Clear start. Add the outcome next time.',
          restructured_example: [
            'Situation: auth was broken in production.',
            'Action: I migrated sessions to Supabase.',
          ],
          technical_terms: [{ term: 'Supabase', definition: 'Backend-as-a-service with auth and DB' }],
          missing_elements: ['quantified result'],
        },
      },
      'I used super a base for auth',
    )
    expect(out.corrected_transcript).toBe('I used Supabase for auth')
    expect(out.coaching_reference.restructured_example).toHaveLength(2)
    expect(out.coaching_reference.technical_terms[0]?.term).toBe('Supabase')
    expect(out.coaching_reference.missing_elements).toEqual(['quantified result'])
  })

  it('2: short / empty-ish input falls back corrected to raw when missing', () => {
    const raw = 'ok yes'
    const out = normalizeAutoStructureOutput({ coaching_reference: { feedback: 'Keep going.' } }, raw)
    expect(out.corrected_transcript).toBe(raw)
    expect(out.coaching_reference.feedback).toContain('Keep going')
  })

  it('3: long verbose coaching is hard-capped', () => {
    const longSentence = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ')
    const out = normalizeAutoStructureOutput(
      {
        corrected_transcript: 'raw answer text here with enough words',
        coaching_reference: {
          feedback: longSentence,
          restructured_example: [longSentence, longSentence, longSentence, longSentence],
          technical_terms: [
            { term: 'a', definition: longSentence },
            { term: 'b', definition: longSentence },
            { term: 'c', definition: longSentence },
            { term: 'd', definition: longSentence },
          ],
          missing_elements: [longSentence, longSentence, longSentence],
        },
      },
      'raw answer text here with enough words',
    )
    expect(out.coaching_reference.restructured_example).toHaveLength(2)
    expect(out.coaching_reference.restructured_example[0]!.split(/\s+/).length).toBeLessThanOrEqual(25)
    expect(out.coaching_reference.feedback.split(/\s+/).length).toBeLessThanOrEqual(40)
    expect(out.coaching_reference.technical_terms).toHaveLength(3)
    expect(out.coaching_reference.technical_terms[0]!.definition.split(/\s+/).length).toBeLessThanOrEqual(12)
    expect(out.coaching_reference.missing_elements).toHaveLength(2)
  })

  it('4: malformed LLM JSON object shape degrades safely', () => {
    const raw = 'I built a campus portal with Next.js'
    expect(normalizeAutoStructureOutput(null, raw).corrected_transcript).toBe(raw)
    expect(normalizeAutoStructureOutput('not-json', raw).corrected_transcript).toBe(raw)
    expect(normalizeAutoStructureOutput([], raw).coaching_reference.restructured_example).toEqual([])
  })

  it('5: missing optional coaching fields get defaults', () => {
    const out = normalizeAutoStructureOutput(
      { corrected_transcript: 'fixed term only' },
      'fixed term only',
    )
    expect(out.coaching_reference.feedback.length).toBeGreaterThan(0)
    expect(out.coaching_reference.restructured_example).toEqual([])
    expect(out.coaching_reference.technical_terms).toEqual([])
    expect(out.coaching_reference.missing_elements).toEqual([])
  })

  it('6: legacy structured_points map into coaching only', () => {
    const out = normalizeAutoStructureOutput(
      {
        feedback: 'Legacy feedback',
        structured_points: ['Point one with enough words here', 'Point two'],
        missing_elements: ['Add result'],
      },
      'original raw',
    )
    expect(out.corrected_transcript).toBe('original raw')
    expect(out.coaching_reference.restructured_example[0]).toContain('Point one')
    expect(out.coaching_reference.feedback).toBe('Legacy feedback')
  })

  it('treats corrected_transcript null as unchanged raw', () => {
    const raw = 'I built InterviewEra with Next.js and Supabase auth.'
    const out = normalizeAutoStructureOutput(
      {
        corrected_transcript: null,
        coaching_reference: {
          feedback: 'Clear project mention. Add a measurable result.',
          restructured_example: [],
          technical_terms: [],
          missing_elements: ['quantified outcome'],
        },
      },
      raw,
    )
    expect(out.corrected_transcript).toBe(raw)
    expect(out.coaching_reference.missing_elements).toEqual(['quantified outcome'])
  })

  it('9: prompt stays compact vs historical verbose contract', () => {
    expect(AUTO_STRUCTURE_PROMPT_VERSION).toBe('auto-structure-v2.3')
    expect(AUTO_STRUCTURE_SYSTEM).toMatch(/NEVER encourage fabricating/i)
    expect(AUTO_STRUCTURE_SYSTEM).toMatch(/ONLY required gaps/i)
    expect(AUTO_STRUCTURE_SYSTEM).toMatch(/optional extras/i)
    expect(AUTO_STRUCTURE_SYSTEM).toMatch(/not "no structure"/i)
    expect(AUTO_STRUCTURE_SYSTEM.length).toBeLessThan(2600)
    const user = buildAutoStructureUserPrompt({
      displayQuestion: 'Tell me about a conflict.',
      targetRole: 'Full Stack Developer',
      rawTranscript: 'We disagreed on scope then shipped.',
    })
    expect(user.length).toBeLessThan(900)
  })

  it('sizes max_tokens above long-transcript echo cost', () => {
    const cap = 900
    // ~1087-char answer that previously hit 450 and truncated
    expect(resolveAutoStructureMaxTokens(1087, cap)).toBeGreaterThanOrEqual(500)
    expect(resolveAutoStructureMaxTokens(1087, cap)).toBeLessThanOrEqual(cap)
    expect(resolveAutoStructureMaxTokens(100, cap)).toBe(500)
    expect(resolveAutoStructureMaxTokens(5000, 900)).toBe(900)
  })
})

describe('auto-structure registry budgets', () => {
  it('caps output tokens and timeout for latency', () => {
    expect(getTokenBudget('auto_structure')).toBe(900)
    expect(getOperationSpec('auto_structure').timeoutMs).toBe(18_000)
    expect(getOperationSpec('auto_structure').llmAttemptTimeoutMs).toBe(14_000)
  })
})
