import { describe, expect, it } from 'vitest'
import { cannedCandidateQuestionsTurn } from '@/lib/ai/scripts/turn-authority'
import { buildCandidateQuestionConversation } from './context'

describe('candidate-question conversation reconstruction', () => {
  it('keeps the original question when the latest utterance is a clarification', () => {
    const conversation = buildCandidateQuestionConversation(
      [
        {
          turn_index: 10,
          phase: 'candidate_questions',
          is_question: true,
          llm_output: cannedCandidateQuestionsTurn(),
          answer_text: 'What about the backend?',
        },
        {
          turn_index: 11,
          phase: 'candidate_questions',
          is_question: true,
          llm_output: {
            speech: 'Do you mean the stack or the work the role owns?',
            candidate_question_action: 'follow_up',
            is_question: true,
            is_follow_up: false,
            phase: 'candidate_questions',
          },
        },
      ],
      'the stack',
    )

    expect(conversation).toContain('What about the backend?')
    expect(conversation).toContain('the stack')
    expect(conversation).toContain('stack or the work')
  })

  it('captures the first candidate question before answer_text is persisted', () => {
    expect(
      buildCandidateQuestionConversation(
        [
          {
            turn_index: 10,
            phase: 'candidate_questions',
            is_question: true,
            llm_output: cannedCandidateQuestionsTurn(),
          },
        ],
        'What about the backend?',
      ),
    ).toContain('What about the backend?')
  })

  it('returns none before any CQ turns exist', () => {
    expect(
      buildCandidateQuestionConversation(
        [
          {
            turn_index: 1,
            phase: 'core',
            is_question: true,
            llm_output: { is_follow_up: false },
            answer_text: 'I used Redis.',
          },
        ],
        'I used Redis.',
      ),
    ).toBe('[NONE]')
  })
})
