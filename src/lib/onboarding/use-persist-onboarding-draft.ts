'use client'

import { useCallback, useEffect, useRef } from 'react'
import { createOnboardingPersistScheduler } from '@/lib/onboarding/onboarding-persist-scheduler'
import type { PersistInput } from '@/lib/onboarding/persist-input'
import { buildPersistedDraft } from '@/lib/onboarding/persisted-draft'

const DEBOUNCE_MS = 450

async function patchOnboardingDraft(input: PersistInput): Promise<void> {
  if (!input.enabled) return

  const draft = buildPersistedDraft(input)
  const res = await fetch('/api/onboarding/state', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(draft),
  })
  if (!res.ok && process.env.NODE_ENV === 'development') {
    console.warn('[onboarding] draft persist failed', res.status)
  }
}

/**
 * Debounced PATCH of users.onboarding_draft.
 * Flushes pending writes on dependency change, tab hide, pagehide, and unmount.
 */
export function usePersistOnboardingDraft(input: PersistInput) {
  const inputRef = useRef(input)
  const schedulerRef = useRef<ReturnType<typeof createOnboardingPersistScheduler> | null>(null)

  if (schedulerRef.current === null) {
    schedulerRef.current = createOnboardingPersistScheduler({
      debounceMs: DEBOUNCE_MS,
      persist: patchOnboardingDraft,
    })
  }

  useEffect(() => {
    inputRef.current = input
  })

  const flushNow = useCallback(async () => {
    await schedulerRef.current?.flushPending()
  }, [])

  useEffect(() => {
    const scheduler = schedulerRef.current!
    scheduler.schedule(input)

    return () => {
      void scheduler.flushPending()
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
    input.aiFollowupsEnabled,
    input.aiFollowupsTouched,
    input.cameraInterviewModeEnabled,
    input.cameraModeTouched,
  ])

  useEffect(() => {
    const scheduler = schedulerRef.current!
    const flush = () => {
      void scheduler.flushPending()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush()
    }

    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      flush()
    }
  }, [])

  return { flushNow }
}
