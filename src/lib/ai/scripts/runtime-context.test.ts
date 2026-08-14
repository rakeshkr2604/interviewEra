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
      candidate_question_action: 'invite',
      candidate_question_guidance_shown: false,
      candidate_question_follow_ups: 0,
      max_candidate_question_follow_ups: 2,
      candidate_question_conversation: 'Candidate: What about the backend?',
    })
    expect(block).toContain('job_description:')
    expect(block).toContain('Must know React and TypeScript')
    expect(block).toContain('0-1 years (Fresher)')
    expect(block).toMatch(/fresher_placement \(campus/)
    expect(block).toContain('follow_up_enabled:')
    expect(block).toMatch(/up to 2 follow-ups when warranted, not always 2/)
    expect(block).toContain('answer_probe_needed:')
    expect(block).toMatch(/answer_probe_needed:\s+unknown/)
    expect(block).toContain('recent_acknowledgments:')
    expect(block).toContain('parent_question:')
    expect(block).toContain('last_candidate_answer:')
    expect(block).toContain('last_answer_source:')
    expect(block).toContain('previous_turn_was_acknowledgment:')
    expect(block).toMatch(/candidate_question_action:\s+invite/)
    expect(block).toMatch(/candidate_question_guidance_shown:\s+false/)
    expect(block).toMatch(/candidate_question_follow_ups:\s+0/)
    expect(block).toMatch(/max_candidate_question_follow_ups:\s+2/)
    expect(block).toContain('candidate_question_conversation:')
    expect(block).toContain('What about the backend?')
  })

  it('injects recovered candidate answer distinct from ack speech', () => {
    const block = buildRuntimeContext({
      candidate_name: 'Asha',
      target_role: 'Associate Developer',
      experience_level: '1 year',
      interview_goal: 'job_switch',
      company_name: 'Not specified',
      company_type: 'unknown',
      difficulty: 'medium',
      resume_summary: 'Not available',
      job_description: 'Not provided',
      question_pool: 'Not available',
      current_phase: 'core',
      question_number: 1,
      total_questions: 6,
      skips_used: 0,
      max_skips: 2,
      last_answer: 'We just used Redis because it is fast.',
      multilingual_detected: false,
      is_returning_user: false,
      self_intro_enabled: true,
      current_turn_index: 8,
      follow_up_enabled: true,
      follow_ups_this_question: 0,
      max_follow_ups_per_question: 2,
      recent_acknowledgments: ['Okay, noted.'],
      parent_question: 'Why Redis over Memcached?',
      last_candidate_answer: 'We just used Redis because it is fast.',
      last_answer_source: 'ack_auto_advance',
      previous_turn_was_acknowledgment: true,
      follow_up_cap_reached: false,
      answer_probe_needed: false,
    })
    expect(block).toContain('Why Redis over Memcached?')
    expect(block).toContain('We just used Redis because it is fast.')
    expect(block).toContain('ack_auto_advance')
    expect(block).toContain('previous_turn_was_acknowledgment: true')
    expect(block).toContain('follow_up_enabled:')
    expect(block).toContain('follow_up_cap_reached:')
    expect(block).toMatch(/follow_up_enabled:\s+true/)
    expect(block).toMatch(/answer_probe_needed:\s+false/)
  })

  it('SCRIPT_M injects next_core_question_type and cap flag', () => {
    const block = buildRuntimeContext({
      candidate_name: 'Asha',
      target_role: 'Associate Developer',
      experience_level: '1 year',
      interview_goal: 'job_switch',
      company_name: 'Not specified',
      company_type: 'unknown',
      difficulty: 'easy',
      resume_summary: 'Not available',
      job_description: 'Not provided',
      question_pool: 'Not available',
      current_phase: 'core',
      question_number: 1,
      total_questions: 4,
      skips_used: 0,
      max_skips: 2,
      last_answer: 'Stack is for locals.',
      multilingual_detected: false,
      is_returning_user: false,
      self_intro_enabled: false,
      current_turn_index: 6,
      follow_up_enabled: true,
      follow_ups_this_question: 2,
      max_follow_ups_per_question: 2,
      recent_acknowledgments: [],
      selected_interviewer: 'Rohan',
      last_question_type: 'technical',
      follow_up_cap_reached: true,
      next_core_question_type: 'behavioral',
    })
    expect(block).toMatch(/follow_up_cap_reached:\s+true/)
    expect(block).toContain('next_core_question_type:')
    expect(block).toContain('behavioral')
    expect(block).toContain('last_question_type:')
    expect(block).toContain('technical')
  })
})
