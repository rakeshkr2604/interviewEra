import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SCRIPT_INTERVIEW_START_PATH,
  V1_ONBOARDING_START_PATH,
  getDefaultInterviewStartPath,
  getDefaultInterviewStartUrl,
  getInterviewEngineDefault,
} from '@/lib/interview/default-interview-start-path'

describe('default-interview-start-path', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to v2.1 script start', () => {
    vi.stubEnv('NEXT_PUBLIC_INTERVIEW_ENGINE_DEFAULT', '')
    expect(getInterviewEngineDefault()).toBe('v2.1')
    expect(getDefaultInterviewStartPath()).toBe(SCRIPT_INTERVIEW_START_PATH)
  })

  it('rolls back to v1 onboarding when flag is v1', () => {
    vi.stubEnv('NEXT_PUBLIC_INTERVIEW_ENGINE_DEFAULT', 'v1')
    expect(getInterviewEngineDefault()).toBe('v1')
    expect(getDefaultInterviewStartPath()).toBe(V1_ONBOARDING_START_PATH)
  })

  it('builds absolute practice URLs from the active default', () => {
    vi.stubEnv('NEXT_PUBLIC_INTERVIEW_ENGINE_DEFAULT', '')
    expect(getDefaultInterviewStartUrl('https://interviewera.com/')).toBe(
      'https://interviewera.com/interview/script/start',
    )
  })
})
