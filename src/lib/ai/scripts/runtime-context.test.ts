import { describe, expect, it } from 'vitest'
import {
  buildRuntimeContext,
  experienceYearsToLevel,
  interviewGoalGlossary,
  isFresherExperienceLevel,
} from './runtime-context'

describe('runtime-context personalization fields', () => {
  it('maps 0 years to Fresher label', () => {
    expect(experienceYearsToLevel(0)).toBe('0-1 years (Fresher)')
    expect(isFresherExperienceLevel(experienceYearsToLevel(0))).toBe(true)
  })

  it('glosses fresher_placement goal', () => {
    expect(interviewGoalGlossary('fresher_placement')).toMatch(/no assumed full-time/)
  })

  it('includes job_description in the injected block', () => {
    const block = buildRuntimeContext({
      candidate_name: 'Asha',
      target_role: 'Associate Developer',
      experience_level: experienceYearsToLevel(0),
      interview_goal: 'fresher_placement',
      company_name: 'Not specified',
      company_type: 'unknown',
      difficulty: 'easy',
      resume_summary: 'Not available',
      job_description: 'Must know React and TypeScript',
      question_pool: 'Not available',
      current_phase: 'core',
      question_number: 1,
      total_questions: 4,
      skips_used: 0,
      max_skips: 2,
      last_answer: '[NONE]',
      multilingual_detected: false,
      is_returning_user: false,
      self_intro_enabled: true,
      current_turn_index: 1,
      follow_up_enabled: true,
      follow_ups_this_question: 0,
      max_follow_ups_per_question: 2,
      recent_acknowledgments: [],
    })
    expect(block).toContain('job_description:')
    expect(block).toContain('Must know React and TypeScript')
    expect(block).toContain('0-1 years (Fresher)')
    expect(block).toMatch(/fresher_placement \(campus/)
    expect(block).toContain('follow_up_enabled:')
    expect(block).toContain('recent_acknowledgments:')
  })
})
