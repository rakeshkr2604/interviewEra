import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { canonicalizeTurnSpeech } from './speech-display-question'
import { validateTurnOutput } from './turn-validator'

const SCRIPTS_DIR = path.join(process.cwd(), 'src/lib/ai/scripts')

describe('H/T/M follow-up prompt contract', () => {
  for (const file of ['SCRIPT_H.md', 'SCRIPT_T.md', 'SCRIPT_M.md'] as const) {
    it(`${file} has a positive is_follow_up:true contract`, () => {
      const text = fs.readFileSync(path.join(SCRIPTS_DIR, file), 'utf8')
      expect(text).toContain('ADAPTIVE FOLLOW-UP CONTRACT')
      expect(text).toContain('"is_follow_up": true')
      expect(text).toContain('last_candidate_answer')
      expect(text).toContain('parent_question')
      expect(text).not.toMatch(/NEVER emit is_follow_up: true when follow_up_enabled = true/)
    })
  }

  it('SCRIPT_H example is a behavioral same-topic follow-up', () => {
    const text = fs.readFileSync(path.join(SCRIPTS_DIR, 'SCRIPT_H.md'), 'utf8')
    expect(text).toContain('What did you personally do in that disagreement')
  })

  it('SCRIPT_H follow-up cap is a maximum, not a quota', () => {
    const text = fs.readFileSync(path.join(SCRIPTS_DIR, 'SCRIPT_H.md'), 'utf8')
    expect(text).toContain('the answer\'s strength decides, not a quota')
    expect(text).toMatch(/not always 2/)
    expect(text).toContain('answer_probe_needed')
    expect(text).toContain('NEVER emit is_follow_up: true when answer_probe_needed = false')
  })

  for (const file of ['SCRIPT_H.md', 'SCRIPT_T.md', 'SCRIPT_M.md'] as const) {
    it(`${file} forbids unjustified praise and documents answer_quality`, () => {
      const text = fs.readFileSync(path.join(SCRIPTS_DIR, file), 'utf8')
      expect(text).toContain('answer_quality')
      expect(text).toContain('Tone policy (mandatory)')
      expect(text).toContain('Great answer!')
      expect(text).toContain('question_echo')
      expect(text).toMatch(/Never praise merely because an answer was submitted/i)
    })
  }

  it('SCRIPT_T example is a technical trade-off follow-up', () => {
    const text = fs.readFileSync(path.join(SCRIPTS_DIR, 'SCRIPT_T.md'), 'utf8')
    expect(text).toContain('What trade-off would you consider before choosing GraphQL over REST')
    expect(text).toContain('Parent-topic lock')
    expect(text).toContain('sorting / O(n log n)')
  })

  it('SCRIPT_M locks follow-up type to the parent', () => {
    const text = fs.readFileSync(path.join(SCRIPTS_DIR, 'SCRIPT_M.md'), 'utf8')
    expect(text).toContain('question_type": "technical"')
    expect(text).toContain('question_type": "behavioral"')
    expect(text).toContain('Follow-up question_type MUST match the parent')
    expect(text).toContain('Was this entirely your decision?')
    expect(text).toContain('do NOT recast the parent, FU1, or FU2 as a new core question')
    expect(text).toContain('next_core_question_type')
  })
})

describe('follow-up output contract', () => {
  it('accepts is_follow_up true with display_question and canonicalizes speech', () => {
    const display =
      'What trade-off would you consider before choosing GraphQL over REST in a production application?'
    const validated = validateTurnOutput(
      {
        speech: `That's a useful point. ${display}`,
        display_question: display,
        tip: null,
        timer_seconds: 90,
        reading_buffer_seconds: 3,
        auto_submit: false,
        allow_skip: false,
        show_auto_structure: true,
        phase: 'core',
        is_question: true,
        is_follow_up: true,
        question_difficulty: null,
        interviewer_emotion: 'curious',
      },
      'SCRIPT_T',
    )
    expect(validated.is_follow_up).toBe(true)
    expect(validated.display_question).toBe(display)
    const canonical = canonicalizeTurnSpeech(validated)
    expect(canonical.speech.endsWith(display)).toBe(true)
  })

  it('defaults omitted is_follow_up to false', () => {
    const validated = validateTurnOutput(
      {
        speech: 'Tell me about a conflict with a teammate. What was the outcome?',
        display_question: 'Tell me about a conflict with a teammate. What was the outcome?',
        tip: null,
        timer_seconds: 90,
        reading_buffer_seconds: 3,
        auto_submit: false,
        allow_skip: true,
        show_auto_structure: true,
        phase: 'core',
        is_question: true,
        question_difficulty: 'medium',
        interviewer_emotion: 'neutral',
      },
      'SCRIPT_H',
    )
    expect(validated.is_follow_up).toBe(false)
  })
})
