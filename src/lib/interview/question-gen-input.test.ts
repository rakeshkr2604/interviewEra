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

  it('uses parse-v2 project name field for grounding hints', () => {
    const summary = buildScriptResumeSummary(
      {
        target_role: 'Full-Stack Developer',
        skills: ['Next.js', 'TypeScript'],
        experience_estimate: '0-1 years',
        projects: [
          { name: 'InterviewEra', description: 'AI interview SaaS', technologies: ['Next.js'] },
          { name: 'SkillBridge AI', description: 'Roadmap generator', technologies: ['Prisma'] },
        ],
      },
      'Full-Stack Developer',
    )
    expect(summary).toContain('InterviewEra')
    expect(summary).toContain('SkillBridge AI')
    expect(extractResumeProjectHints({
      projects: [{ name: 'InterviewEra' }],
    })).toEqual(['InterviewEra'])
  })
})
