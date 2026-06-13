import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  buildVoiceRecoveryState,
  isSavedVoiceMode,
  isVoiceRecoveryBlockingMic,
  shouldOfferVoiceRecovery,
  wasPageReloaded,
  VOICE_RECOVERY_INITIAL,
} from '@/lib/voice/voice-recovery'
import {
  reconcileDraft,
  saveInterviewDraft,
  type InterviewDraftInput,
} from '@/lib/session/interview-draft'

const INTERVIEW_ID = 'test-interview-123'

function makeDraftInput(
  overrides: Partial<InterviewDraftInput> = {},
): InterviewDraftInput {
  return {
    interviewId: INTERVIEW_ID,
    questionIndex: 2,
    phase: 'candidate_answering',
    transcript: 'I led a team project using React and Node.',
    timerRemaining: 42,
    timerBudget: 60,
    skipCount: 0,
    pendingFollowUp: null,
    inputMode: 'voice',
    ...overrides,
  }
}

describe('voice-recovery', () => {
  describe('isSavedVoiceMode', () => {
    it('recognizes voice and deepgram', () => {
      expect(isSavedVoiceMode('voice')).toBe(true)
      expect(isSavedVoiceMode('deepgram')).toBe(true)
      expect(isSavedVoiceMode('text')).toBe(false)
    })
  })

  describe('shouldOfferVoiceRecovery', () => {
    it('offers recovery for Voice mode draft on matching question', () => {
      const fullDraft = {
        version: 1,
        updatedAt: Date.now(),
        ...makeDraftInput({ inputMode: 'voice' }),
      }
      expect(shouldOfferVoiceRecovery(fullDraft, 2)).toBe(true)
    })

    it('offers recovery for AI Voice mode after refresh', () => {
      const fullDraft = {
        version: 1,
        updatedAt: Date.now(),
        ...makeDraftInput({ inputMode: 'deepgram' }),
      }
      expect(shouldOfferVoiceRecovery(fullDraft, 2)).toBe(true)
    })

    it('does not offer recovery for Type mode draft', () => {
      const fullDraft = {
        version: 1,
        updatedAt: Date.now(),
        ...makeDraftInput({ inputMode: 'text' }),
      }
      expect(shouldOfferVoiceRecovery(fullDraft, 2)).toBe(false)
    })

    it('does not offer recovery when question index mismatches', () => {
      const fullDraft = {
        version: 1,
        updatedAt: Date.now(),
        ...makeDraftInput({ inputMode: 'voice', questionIndex: 2 }),
      }
      expect(shouldOfferVoiceRecovery(fullDraft, 3)).toBe(false)
    })

    it('does not offer recovery outside candidate_answering', () => {
      const fullDraft = {
        version: 1,
        updatedAt: Date.now(),
        ...makeDraftInput({ inputMode: 'voice', phase: 'feedback' }),
      }
      expect(shouldOfferVoiceRecovery(fullDraft, 2)).toBe(false)
    })

    it('does not offer recovery when transcript is empty', () => {
      const fullDraft = {
        version: 1,
        updatedAt: Date.now(),
        ...makeDraftInput({ inputMode: 'voice', transcript: '   ' }),
      }
      expect(shouldOfferVoiceRecovery(fullDraft, 2)).toBe(false)
    })
  })

  describe('buildVoiceRecoveryState', () => {
    it('preserves transcript and mode', () => {
      const fullDraft = {
        version: 1,
        updatedAt: Date.now(),
        ...makeDraftInput({
          inputMode: 'deepgram',
          transcript: 'STAR answer preserved',
        }),
      }
      const state = buildVoiceRecoveryState(fullDraft)
      expect(state.phase).toBe('pending')
      expect(state.savedMode).toBe('deepgram')
      expect(state.transcript).toBe('STAR answer preserved')
      expect(state.error).toBeNull()
    })
  })

  describe('isVoiceRecoveryBlockingMic', () => {
    it('blocks mic only while resuming (pending is informational)', () => {
      expect(isVoiceRecoveryBlockingMic({ ...VOICE_RECOVERY_INITIAL, phase: 'pending', savedMode: 'voice', transcript: '' })).toBe(false)
      expect(isVoiceRecoveryBlockingMic({ ...VOICE_RECOVERY_INITIAL, phase: 'resuming', savedMode: 'voice', transcript: '' })).toBe(true)
      expect(isVoiceRecoveryBlockingMic(VOICE_RECOVERY_INITIAL)).toBe(false)
      expect(isVoiceRecoveryBlockingMic({ ...VOICE_RECOVERY_INITIAL, phase: 'failed', savedMode: 'voice', transcript: '', error: 'x' })).toBe(false)
    })
  })

  describe('wasPageReloaded', () => {
    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('detects reload navigation type', () => {
      vi.stubGlobal('window', {})
      vi.stubGlobal('performance', {
        getEntriesByType: vi.fn(() => [{ type: 'reload' }]),
        navigation: { type: 0 },
      })
      expect(wasPageReloaded()).toBe(true)
    })

    it('returns false for navigate type', () => {
      vi.stubGlobal('window', {})
      vi.stubGlobal('performance', {
        getEntriesByType: vi.fn(() => [{ type: 'navigate' }]),
        navigation: { type: 0 },
      })
      expect(wasPageReloaded()).toBe(false)
    })
  })
})

describe('interview-draft voice recovery integration', () => {
  let store: Record<string, string>

  beforeEach(() => {
    store = {}
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value
        },
        removeItem: (key: string) => {
          delete store[key]
        },
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('restores Voice mode draft with transcript preserved', () => {
    saveInterviewDraft(makeDraftInput({ inputMode: 'voice', transcript: 'My voice answer so far' }))
    const result = reconcileDraft(INTERVIEW_ID, 2)
    expect(result.action).toBe('restore')
    if (result.action === 'restore') {
      expect(result.draft.inputMode).toBe('voice')
      expect(result.draft.transcript).toBe('My voice answer so far')
      expect(shouldOfferVoiceRecovery(result.draft, 2)).toBe(true)
    }
  })

  it('restores AI Voice mode draft with transcript preserved', () => {
    saveInterviewDraft(makeDraftInput({ inputMode: 'deepgram', transcript: 'Deepgram partial answer' }))
    const result = reconcileDraft(INTERVIEW_ID, 2)
    expect(result.action).toBe('restore')
    if (result.action === 'restore') {
      expect(result.draft.inputMode).toBe('deepgram')
      expect(shouldOfferVoiceRecovery(result.draft, 2)).toBe(true)
    }
  })

  it('does not offer voice recovery for text-mode draft after refresh', () => {
    saveInterviewDraft(makeDraftInput({ inputMode: 'text' }))
    const result = reconcileDraft(INTERVIEW_ID, 2)
    expect(result.action).toBe('restore')
    if (result.action === 'restore') {
      expect(shouldOfferVoiceRecovery(result.draft, 2)).toBe(false)
    }
  })

  it('discards draft when server already advanced (submitted before refresh)', () => {
    saveInterviewDraft(makeDraftInput({ inputMode: 'voice' }))
    const result = reconcileDraft(INTERVIEW_ID, 3)
    expect(result.action).toBe('discard')
    if (result.action === 'discard') {
      expect(result.reason).toBe('already_submitted')
    }
  })
})

describe('platform-specific refresh scenarios (logic)', () => {
  let store: Record<string, string>

  beforeEach(() => {
    store = {}
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
          store[key] = value
        },
        removeItem: (key: string) => {
          delete store[key]
        },
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('Safari reload: voice draft still reconciles and triggers recovery', () => {
    saveInterviewDraft(
      makeDraftInput({
        inputMode: 'voice',
        transcript: 'Safari interrupted answer',
      }),
    )
    const result = reconcileDraft(INTERVIEW_ID, 2)
    expect(result.action).toBe('restore')
    if (result.action === 'restore') {
      expect(shouldOfferVoiceRecovery(result.draft, 2)).toBe(true)
      expect(buildVoiceRecoveryState(result.draft).transcript).toContain('Safari')
    }
  })

  it('Android Chrome reload: deepgram draft preserves transcript', () => {
    saveInterviewDraft(
      makeDraftInput({
        inputMode: 'deepgram',
        transcript: 'Android AI voice answer',
      }),
    )
    const result = reconcileDraft(INTERVIEW_ID, 2)
    if (result.action === 'restore') {
      const recovery = buildVoiceRecoveryState(result.draft)
      expect(recovery.savedMode).toBe('deepgram')
      expect(recovery.transcript).toBe('Android AI voice answer')
    }
  })

  it('permission denied path: recovery stays failed until user chooses typing', () => {
    const failed = {
      phase: 'failed' as const,
      savedMode: 'voice' as const,
      transcript: 'still here',
      error: 'Microphone permission was denied.',
    }
    expect(isVoiceRecoveryBlockingMic(failed)).toBe(false)
    expect(failed.error).toContain('denied')
  })
})
