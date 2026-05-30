'use client'

import { useCallback, useEffect, useRef } from 'react'
import { buildPersistedDraft } from '@/lib/onboarding/persisted-draft'
import type { OnboardingData } from '@/types/onboarding.types'
import type { InterviewDifficulty, ParsedJobDescription } from '@/types/app.types'

type PersistInput = {
  step: 1 | 2
  data: OnboardingData
  resumeFileName: string | null
  jdText: string
  parsedJd: ParsedJobDescription | null
  jdParseStatus: 'idle' | 'parsing' | 'ready' | 'failed'
  difficulty: InterviewDifficulty
  difficultyTouched: boolean
  /** Skip while upload/parse is in-flight to avoid overwriting with stale resumeId. */
  enabled: boolean
}

const DEBOUNCE_MS = 450

/** Debounced PATCH of users.onboarding_draft — database is source of truth after refresh. */
async function patchOnboardingDraft(cur: PersistInput): Promise<void> {
  if (!cur.enabled) return

  const draft = buildPersistedDraft(cur)
  try {
    await fetch('/api/onboarding/state', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(draft),
    })
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[onboarding] draft persist failed', e)
    }
  }
}

export function usePersistOnboardingDraft(input: PersistInput) {
  const inputRef = useRef(input)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    inputRef.current = input
  })

  const flush = useCallback(async () => {
    await patchOnboardingDraft(inputRef.current)
  }, [])

  useEffect(() => {
    if (!input.enabled) return

    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      void patchOnboardingDraft(inputRef.current)
    }, DEBOUNCE_MS) as number

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
  }, [
    input.enabled,
    input.step,
    input.data.goal,
    input.data.role,
    input.data.experienceYears,
    input.data.mode,
    input.data.interviewerId,
    input.data.resumeId,
    input.resumeFileName,
    input.jdText,
    input.parsedJd,
    input.jdParseStatus,
    input.difficulty,
    input.difficultyTouched,
  ])

  return { flushNow: flush }
}
