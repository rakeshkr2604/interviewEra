import { describe, expect, it } from 'vitest'
import {
  clampFollowUpContextText,
  isSpecialTurnAnswer,
  isUsableCandidateAnswer,
  lastFollowUpQuestionSinceParent,
  lastParentCoreQuestion,
  MAX_CANDIDATE_ANSWER_CHARS,
  resolveFollowUpGenerationContext,
  type ScriptTurnRowWithAnswer,
} from './follow-up-context'

function q(partial: Partial<ScriptTurnRowWithAnswer> & { turn_index: number }): ScriptTurnRowWithAnswer {
  return {
    phase: 'core',
    is_question: true,
    llm_output: {
      is_follow_up: false,
      speech: 'Tell me about a conflict.',
      display_question: 'Tell me about a conflict with a teammate. What was the outcome?',
    },
    ...partial,
  }
}

describe('follow-up-context', () => {
  it('treats skip/timeout/none as special and not usable candidate answers', () => {
    expect(isSpecialTurnAnswer('[SKIPPED]')).toBe(true)
    expect(isSpecialTurnAnswer('[TIMEOUT]')).toBe(true)
    expect(isSpecialTurnAnswer('[NONE]')).toBe(true)
    expect(isUsableCandidateAnswer('[SKIPPED]')).toBe(false)
    expect(isUsableCandidateAnswer('  ')).toBe(false)
    expect(isUsableCandidateAnswer('We shipped it late.')).toBe(true)
  })

  it('clamps long candidate answers', () => {
    const long = 'x'.repeat(MAX_CANDIDATE_ANSWER_CHARS + 40)
    const clamped = clampFollowUpContextText(long, MAX_CANDIDATE_ANSWER_CHARS)
    expect(clamped.endsWith('…')).toBe(true)
    expect(clamped.length).toBe(MAX_CANDIDATE_ANSWER_CHARS + 1)
  })

  it('counts only the latest non-follow-up core question as parent', () => {
    const turns = [
      q({ turn_index: 1, llm_output: { is_follow_up: false, display_question: 'Q1' } }),
      q({ turn_index: 2, llm_output: { is_follow_up: true, display_question: 'Q1a' } }),
    ]
    expect(lastParentCoreQuestion(turns)?.turn_index).toBe(1)
  })

  it('lastFollowUpQuestionSinceParent ignores FUs from a previous parent', () => {
    const turns = [
      q({ turn_index: 1, llm_output: { is_follow_up: false, display_question: 'Q1' } }),
      q({ turn_index: 2, llm_output: { is_follow_up: true, display_question: 'Q1-follow-up' } }),
      q({ turn_index: 3, llm_output: { is_follow_up: false, display_question: 'Q2 GraphQL parent' } }),
    ]
    expect(lastFollowUpQuestionSinceParent(turns)).toBe('')
  })

  it('lastFollowUpQuestionSinceParent returns the FU after the current parent', () => {
    const turns = [
      q({ turn_index: 1, llm_output: { is_follow_up: false, display_question: 'Q1' } }),
      q({ turn_index: 2, llm_output: { is_follow_up: true, display_question: 'Q1-follow-up' } }),
      q({ turn_index: 3, llm_output: { is_follow_up: false, display_question: 'Q2' } }),
      q({ turn_index: 4, llm_output: { is_follow_up: true, display_question: 'Q2-follow-up' } }),
    ]
    expect(lastFollowUpQuestionSinceParent(turns)).toBe('Q2-follow-up')
  })

  it('on direct submit, lastAnswer is the candidate answer (not ack speech)', () => {
    const answer = 'We kind of handled it as a team I guess.'
    const ctx = resolveFollowUpGenerationContext({
      turns: [q({ turn_index: 4 })],
      lastAnswer: answer,
      requestPhase: 'core',
    })
    expect(ctx.last_answer_source).toBe('candidate_submit')
    expect(ctx.last_answer_for_prompt).toBe(answer)
    expect(ctx.last_candidate_answer).toBe(answer)
    expect(ctx.previous_turn_was_acknowledgment).toBe(false)
    expect(ctx.has_valid_parent_core_question).toBe(true)
    expect(ctx.parent_question).toContain('conflict')
  })

  it('ack auto-advance does not use interviewer speech as the candidate answer', () => {
    const candidate = 'We just went with Redis because it is fast.'
    const ack = 'Okay, noted.'
    const ctx = resolveFollowUpGenerationContext({
      turns: [
        q({
          turn_index: 5,
          answer_text: candidate,
        }),
        q({
          turn_index: 6,
          is_question: false,
          llm_output: { is_follow_up: false, speech: ack, display_question: null },
        }),
      ],
      lastAnswer: ack,
      requestPhase: 'core',
    })
    expect(ctx.last_answer_source).toBe('ack_auto_advance')
    expect(ctx.previous_turn_was_acknowledgment).toBe(true)
    expect(ctx.last_answer_for_prompt).toBe(candidate)
    expect(ctx.last_candidate_answer).toBe(candidate)
    expect(ctx.last_answer_for_prompt).not.toBe(ack)
    expect(ctx.has_valid_parent_core_question).toBe(true)
  })

  it('after a follow-up, parent stays the original core question and answer is the latest', () => {
    const fuAnswer = 'I meant I owned the cache invalidation myself.'
    const ctx = resolveFollowUpGenerationContext({
      turns: [
        q({
          turn_index: 5,
          answer_text: 'We used Redis.',
          llm_output: { is_follow_up: false, display_question: 'Why Redis over Memcached?' },
        }),
        q({
          turn_index: 6,
          answer_text: fuAnswer,
          llm_output: {
            is_follow_up: true,
            display_question: 'What was your individual contribution?',
          },
        }),
        q({
          turn_index: 7,
          is_question: false,
          llm_output: { speech: 'I follow the logic.', display_question: null },
        }),
      ],
      lastAnswer: 'I follow the logic.',
      requestPhase: 'core',
    })
    expect(ctx.parent_question).toBe('Why Redis over Memcached?')
    expect(ctx.last_candidate_answer).toBe(fuAnswer)
    expect(ctx.has_valid_parent_core_question).toBe(true)
  })

  it('skip/timeout cannot produce a valid parent for follow-up', () => {
    const skipped = resolveFollowUpGenerationContext({
      turns: [q({ turn_index: 3 })],
      lastAnswer: '[SKIPPED]',
      requestPhase: 'core',
    })
    expect(skipped.last_answer_source).toBe('special')
    expect(skipped.has_valid_parent_core_question).toBe(false)
    expect(skipped.last_answer_for_prompt).toBe('[SKIPPED]')

    const timeout = resolveFollowUpGenerationContext({
      turns: [q({ turn_index: 3 })],
      lastAnswer: '[TIMEOUT]',
      requestPhase: 'core',
    })
    expect(timeout.has_valid_parent_core_question).toBe(false)
  })

  it('warmup/self_intro/cq have no valid parent follow-up context', () => {
    for (const phase of ['warmup', 'self_intro', 'candidate_questions', 'closing'] as const) {
      const ctx = resolveFollowUpGenerationContext({
        turns: [
          q({
            turn_index: 1,
            phase,
            llm_output: { is_follow_up: false, speech: 'Hi', display_question: null },
          }),
        ],
        lastAnswer: 'I am nervous.',
        requestPhase: phase,
      })
      expect(ctx.has_valid_parent_core_question).toBe(false)
    }
  })

  it('SCRIPT_M parent question_type comes from the parent turn', () => {
    const ctx = resolveFollowUpGenerationContext({
      turns: [
        q({
          turn_index: 4,
          llm_output: {
            is_follow_up: false,
            question_type: 'technical',
            display_question: 'What is CAP theorem?',
          },
        }),
      ],
      lastAnswer: 'CAP is consistency availability partition.',
      requestPhase: 'core',
    })
    expect(ctx.parent_question_type).toBe('technical')
  })

  it('missing stored answer on ack auto-advance does not fall back to ack speech', () => {
    const ack = 'That sounds like a real challenge.'
    const ctx = resolveFollowUpGenerationContext({
      turns: [
        q({ turn_index: 5, answer_text: null }),
        q({
          turn_index: 6,
          is_question: false,
          llm_output: { speech: ack, display_question: null },
        }),
      ],
      lastAnswer: ack,
      requestPhase: 'core',
    })
    expect(ctx.last_answer_for_prompt).not.toBe(ack)
    expect(ctx.last_candidate_answer).toBe('')
    expect(ctx.has_valid_parent_core_question).toBe(false)
  })
})
