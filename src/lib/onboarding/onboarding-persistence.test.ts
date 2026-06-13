import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  createOnboardingPersistScheduler,
  onboardingDraftFingerprint,
} from '@/lib/onboarding/onboarding-persist-scheduler'
import {
  emptyOnboardingPageSnapshot,
  mergeOnboardingHydration,
  snapshotFromHydration,
} from '@/lib/onboarding/apply-hydration'
import { buildPersistedDraft, draftToOnboardingData } from '@/lib/onboarding/persisted-draft'
import type { PersistInput } from '@/lib/onboarding/persist-input'
import type { OnboardingHydration } from '@/lib/onboarding/load-hydration'
import type { OnboardingData } from '@/types/onboarding.types'

const STEP1_DATA: OnboardingData = {
  goal: 'fresher_placement',
  role: 'Backend Developer',
  experienceYears: 0,
  mode: 'Technical',
  interviewerId: 'priya',
  resumeId: '11111111-1111-4111-8111-111111111111',
  resumeText: '',
  skills: [],
  projects: [],
  placementDate: null,
}

function makePersistInput(overrides: Partial<PersistInput> = {}): PersistInput {
  return {
    step: 1,
    data: STEP1_DATA,
    resumeFileName: 'resume.pdf',
    jdText: '',
    parsedJd: null,
    jdParseStatus: 'idle',
    difficulty: 'medium',
    difficultyTouched: false,
    aiFollowupsEnabled: true,
    enabled: true,
    ...overrides,
  }
}

function makeHydration(overrides: Partial<OnboardingHydration> = {}): OnboardingHydration {
  const draft = buildPersistedDraft(makePersistInput({ step: 2, jdText: 'Senior backend role' }))
  const data = draftToOnboardingData(draft)
  return {
    draft,
    resume: {
      id: STEP1_DATA.resumeId!,
      status: 'parsed',
      parsedData: { name: 'Test', email: 't@e.com', skills: ['Go'], experience: [], projects: [], education: [], target_roles: [] },
      fileName: null,
    },
    step: 2,
    data,
    resumeFileName: 'resume.pdf',
    parsedResume: { name: 'Test', email: 't@e.com', skills: ['Go'], experience: [], projects: [], education: [], target_roles: [] },
    resumeState: 'parsed',
    jdText: 'Senior backend role',
    parsedJd: null,
    jdParseStatus: 'idle',
    difficulty: 'medium',
    difficultyTouched: false,
    aiFollowupsEnabled: true,
    ...overrides,
  }
}

describe('onboarding persist scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('Scenario A: immediate refresh flushes pending Step 1 changes', async () => {
    const writes: PersistInput[] = []
    const scheduler = createOnboardingPersistScheduler({
      debounceMs: 450,
      persist: async (input) => {
        writes.push(structuredClone(input))
      },
    })

    scheduler.schedule(makePersistInput())
    expect(writes).toHaveLength(0)

    await scheduler.flushPending()

    expect(writes).toHaveLength(1)
    expect(writes[0]?.data.goal).toBe('fresher_placement')
    expect(writes[0]?.data.role).toBe('Backend Developer')
    expect(writes[0]?.data.experienceYears).toBe(0)
    expect(writes[0]?.data.mode).toBe('Technical')
    expect(writes[0]?.data.interviewerId).toBe('priya')
    expect(writes[0]?.difficulty).toBe('medium')
    expect(writes[0]?.aiFollowupsEnabled).toBe(true)
  })

  it('Scenario B: navigate to Step 2 flushes Step 1 before step change', async () => {
    const writes: PersistInput[] = []
    const scheduler = createOnboardingPersistScheduler({
      debounceMs: 450,
      persist: async (input) => {
        writes.push(structuredClone(input))
      },
    })

    scheduler.schedule(makePersistInput())
    await scheduler.flushPending()

    scheduler.schedule(
      makePersistInput({
        step: 2,
        jdText: 'Looking for backend engineer',
        jdParseStatus: 'ready',
      }),
    )
    await scheduler.flushPending()

    expect(writes).toHaveLength(2)
    expect(writes[1]?.step).toBe(2)
    expect(writes[1]?.data.goal).toBe('fresher_placement')
    expect(writes[1]?.data.role).toBe('Backend Developer')
    expect(writes[1]?.jdText).toBe('Looking for backend engineer')
  })

  it('Scenario C: dependency cleanup flush preserves state for back/forward', async () => {
    const writes: PersistInput[] = []
    const scheduler = createOnboardingPersistScheduler({
      debounceMs: 450,
      persist: async (input) => {
        writes.push(structuredClone(input))
      },
    })

    scheduler.schedule(makePersistInput({ step: 2 }))
    await scheduler.flushPending()

    scheduler.schedule(makePersistInput({ step: 1 }))
    await scheduler.flushPending()

    expect(writes.at(-1)?.step).toBe(1)
    expect(writes.at(-1)?.data.role).toBe('Backend Developer')
  })

  it('Scenario D: tab close/reopen simulation via flushPending before timer', async () => {
    const writes: PersistInput[] = []
    const scheduler = createOnboardingPersistScheduler({
      debounceMs: 450,
      persist: async (input) => {
        writes.push(structuredClone(input))
      },
    })

    scheduler.schedule(makePersistInput())
    await scheduler.flushPending()

    const hydration = makeHydration()
    const restored = snapshotFromHydration(hydration)

    expect(restored.step).toBe(2)
    expect(restored.data.goal).toBe('fresher_placement')
    expect(restored.data.role).toBe('Backend Developer')
    expect(restored.data.experienceYears).toBe(0)
    expect(restored.data.mode).toBe('Technical')
    expect(restored.data.interviewerId).toBe('priya')
    expect(restored.jdText).toBe('Senior backend role')
    expect(restored.parsedResume?.name).toBe('Test')
    expect(restored.aiFollowupsEnabled).toBe(true)
    expect(writes).toHaveLength(1)
  })

  it('deduplicates identical snapshots', async () => {
    let callCount = 0
    const scheduler = createOnboardingPersistScheduler({
      debounceMs: 450,
      persist: async () => {
        callCount += 1
      },
    })

    const input = makePersistInput()
    scheduler.schedule(input)
    await scheduler.flushPending()
    await scheduler.flushPending()
    await scheduler.flushPending()

    expect(callCount).toBe(1)
    expect(onboardingDraftFingerprint(input)).toBeTruthy()
  })

  it('does not skip experienceYears = 0 in fingerprint', () => {
    const fp = onboardingDraftFingerprint(makePersistInput())
    expect(fp).toContain('"experienceYears":0')
  })
})

describe('onboarding hydration restore', () => {
  it('restores experienceYears 0 after refresh (not treated as missing)', () => {
    const hydration = makeHydration({
      data: { ...draftToOnboardingData(buildPersistedDraft(makePersistInput())), experienceYears: 0 },
    })
    const merged = mergeOnboardingHydration(emptyOnboardingPageSnapshot(), hydration)
    expect(merged.data.experienceYears).toBe(0)
  })

  it('restores all Step 1 fields alongside Step 2 resume context', () => {
    const hydration = makeHydration()
    const snap = snapshotFromHydration(hydration)

    expect(snap.data.goal).toBe('fresher_placement')
    expect(snap.data.role).toBe('Backend Developer')
    expect(snap.data.mode).toBe('Technical')
    expect(snap.data.interviewerId).toBe('priya')
    expect(snap.resumeState).toBe('parsed')
    expect(snap.parsedResume).not.toBeNull()
    expect(snap.difficulty).toBe('medium')
  })
})
