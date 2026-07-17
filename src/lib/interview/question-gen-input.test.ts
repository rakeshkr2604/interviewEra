import { describe, expect, it } from 'vitest'
import {
  buildScriptResumeSummary,
  extractResumeProjectHints,
} from './question-gen-input'

describe('buildScriptResumeSummary', () => {
  it('appends project titles for fresher resumes', () => {
    const summary = buildScriptResumeSummary(
      {
        target_role: 'Junior SE',
        skills: ['React', 'Python'],
        experience_estimate: 'Fresher / student',
        projects: [
          { title: 'Campus Placement Portal' },
          { title: 'Hackathon Chatbot' },
        ],
      },
      'Junior SE',
    )
    expect(summary).toContain('Projects:')
    expect(summary).toContain('Campus Placement Portal')
    expect(extractResumeProjectHints({
      projects: [{ title: 'Campus Placement Portal' }],
    })).toEqual(['Campus Placement Portal'])
  })
})
