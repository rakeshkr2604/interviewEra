import { describe, expect, it } from 'vitest'
import {
  cannedCandidateQuestionGuidanceTurn,
  selectCandidateQuestionGuidance,
} from './guidance'

describe('candidate-question guidance', () => {
  it('is stable for retries but varies across interviews', () => {
    const common = {
      targetRole: 'Software Engineer',
      scriptType: 'SCRIPT_T' as const,
      interviewGoal: 'job_switch',
      experienceLevel: '3 years',
    }
    const first = selectCandidateQuestionGuidance({
      ...common,
      interviewId: 'interview-a',
    })
    expect(
      selectCandidateQuestionGuidance({ ...common, interviewId: 'interview-a' }),
    ).toEqual(first)

    const selections = new Set(
      ['interview-a', 'interview-b', 'interview-c', 'interview-d'].map((interviewId) =>
        selectCandidateQuestionGuidance({ ...common, interviewId }).join('|'),
      ),
    )
    expect(selections.size).toBeGreaterThan(1)
  })

  it('prioritizes technical context for SCRIPT_T', () => {
    const questions = selectCandidateQuestionGuidance({
      interviewId: 'technical-session',
      targetRole: 'Backend Engineer',
      scriptType: 'SCRIPT_T',
      interviewGoal: 'job_switch',
      experienceLevel: '4 years (Mid-level)',
    })
    expect(questions.join(' ')).toMatch(/technical|projects|ownership/i)
  })

  it('prioritizes onboarding or growth for freshers', () => {
    const questions = selectCandidateQuestionGuidance({
      interviewId: 'fresher-session',
      targetRole: 'Graduate Engineer',
      scriptType: 'SCRIPT_M',
      interviewGoal: 'fresher_placement',
      experienceLevel: '0-1 years (Fresher)',
    })
    expect(questions.join(' ')).toMatch(/onboarding|mentor|learning|growth/i)
  })

  it('builds a concise, non-scored final-opportunity turn', () => {
    const turn = cannedCandidateQuestionGuidanceTurn({
      questions: [
        'What would success look like in the first six months?',
        'What kind of projects would I work on?',
      ],
    })
    expect(turn.phase).toBe('candidate_questions')
    expect(turn.candidate_question_action).toBe('guidance')
    expect(turn.is_question).toBe(true)
    expect(turn.is_follow_up).toBe(false)
    expect(turn.auto_submit).toBe(true)
    expect(turn.show_auto_structure).toBe(false)
    expect(turn.tip).toContain('•')
  })
})
