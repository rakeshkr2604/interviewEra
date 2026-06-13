import { buildPersistedDraft } from '@/lib/onboarding/persisted-draft'
import type { PersistInput } from '@/lib/onboarding/persist-input'

export type OnboardingPersistFn = (input: PersistInput) => Promise<void>

/** Stable fingerprint — ignores updatedAt so identical snapshots are not rewritten. */
export function onboardingDraftFingerprint(input: PersistInput): string | null {
  if (!input.enabled) return null
  const draft = buildPersistedDraft(input)
  const { updatedAt: _updatedAt, ...rest } = draft
  return JSON.stringify(rest)
}

/**
 * Debounced onboarding draft writer with flush-on-cancel and serialized writes.
 * Prevents lost Step 1 fields when the user refreshes or changes step before debounce fires.
 */
export function createOnboardingPersistScheduler(options: {
  debounceMs: number
  persist: OnboardingPersistFn
}) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let latestInput: PersistInput | null = null
  let lastWrittenFingerprint: string | null = null
  let writeChain: Promise<void> = Promise.resolve()

  const enqueueWrite = (input: PersistInput): Promise<void> => {
    latestInput = input
    writeChain = writeChain
      .then(async () => {
        if (!input.enabled) return
        const fingerprint = onboardingDraftFingerprint(input)
        if (!fingerprint || fingerprint === lastWrittenFingerprint) return
        await options.persist(input)
        lastWrittenFingerprint = fingerprint
      })
      .catch(() => {
        /* persist errors are logged by caller */
      })
    return writeChain
  }

  const schedule = (input: PersistInput): void => {
    latestInput = input
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      void enqueueWrite(input)
    }, options.debounceMs)
  }

  /** Flush any debounced write and await the serialized queue. */
  const flushPending = (): Promise<void> => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    if (!latestInput) return writeChain
    return enqueueWrite(latestInput)
  }

  const hasPendingTimer = (): boolean => timer !== null

  return { schedule, flushPending, hasPendingTimer }
}
