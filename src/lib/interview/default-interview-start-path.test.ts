import { describe, expect, it } from 'vitest'
import {
  SCRIPT_INTERVIEW_START_PATH,
  getDefaultInterviewStartPath,
  getDefaultInterviewStartUrl,
} from '@/lib/interview/default-interview-start-path'

describe('default-interview-start-path', () => {
  it('always returns v2.1 script start', () => {
    expect(getDefaultInterviewStartPath()).toBe(SCRIPT_INTERVIEW_START_PATH)
  })

  it('builds absolute practice URLs from the script start path', () => {
    expect(getDefaultInterviewStartUrl('https://interviewera.com/')).toBe(
      'https://interviewera.com/interview/script/start',
    )
  })
})
