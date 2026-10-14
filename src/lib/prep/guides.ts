import { SCRIPT_INTERVIEW_START_PATH } from '@/lib/interview/default-interview-start-path'
import type { ScriptStartInterviewMode } from '@/lib/interview/script-start-query'

export const PREP_UPDATED = '2026-10-14'

export const PREP_GUIDES = {
  chatgpt: {
    path: '/resources/chatgpt-interview-preparation',
    metaTitle: 'ChatGPT Interview Preparation',
    title: 'How to Use ChatGPT for Interview Preparation',
    description:
      'Prepare honest interview answers with ChatGPT from your real resume, then practise them aloud in an InterviewEra mock.',
    readTime: '12 min read',
    eyebrow: 'Prompt practice',
  },
  hr: {
    path: '/resources/hr-interview-answer-framework',
    metaTitle: 'HR Interview Answer Framework',
    title: 'HR Interview Answers and Practical Frameworks',
    description:
      'What interviewers listen for in common HR questions, with a structure, a labelled example, mistakes, and a self-review check.',
    readTime: '16 min read',
    eyebrow: 'HR answers',
  },
  assessment: {
    path: '/resources/online-assessment-preparation',
    metaTitle: 'Online Assessment Preparation',
    title: 'Online Assessment and Video Interview Preparation',
    description:
      'Prepare for aptitude, coding, communication, and recorded video assessments. Formats and rules vary by company and drive.',
    readTime: '11 min read',
    eyebrow: 'Assessments',
  },
} as const

export type PrepGuideKey = keyof typeof PREP_GUIDES

export function focusedMockHref(mode?: ScriptStartInterviewMode): string {
  if (!mode) return SCRIPT_INTERVIEW_START_PATH
  return `${SCRIPT_INTERVIEW_START_PATH}?mode=${mode}`
}
