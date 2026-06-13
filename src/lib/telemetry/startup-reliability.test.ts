import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  InterviewStartupTimeline,
  computeStartupFunnel,
  runStartInterviewWithTelemetry,
  type StartupStage,
} from '@/lib/telemetry/interview-startup-telemetry'
import {
  PREPARE_CLIENT_TIMEOUT_MS,
  QUESTION_GEN_STAGE_DURATION_MS,
  STARTUP_POST_READY_TIMEOUT_MS,
  classifyPrepareError,
  getQuestionGenHeadline,
  getQuestionGenStageIndex,
  getQuestionGenSubtext,
  getStartupLoadingExplanation,
  getStartupSubtext,
  getStartupWatchdogDelayMs,
  mapFetchErrorToFailureKind,
  shouldShowStartupRecovery,
} from '@/lib/telemetry/startup-reliability-policy'

describe('startup watchdog policy', () => {
  it('uses 72s watchdog while question generation is active', () => {
    expect(getStartupWatchdogDelayMs(true)).toBe(PREPARE_CLIENT_TIMEOUT_MS)
  })

  it('uses 20s watchdog for post-fetch startup steps', () => {
    expect(getStartupWatchdogDelayMs(false)).toBe(STARTUP_POST_READY_TIMEOUT_MS)
  })

  it('never shows recovery panel during active question generation', () => {
    expect(
      shouldShowStartupRecovery({
        questionGenActive: true,
        showTimeoutRecovery: true,
        confirmedFailure: 'none',
        phase: 'loading',
      }),
    ).toBe(false)
  })

  it('shows recovery on confirmed prepare timeout failure', () => {
    expect(
      shouldShowStartupRecovery({
        questionGenActive: false,
        showTimeoutRecovery: false,
        confirmedFailure: 'prepare_timeout',
        phase: 'loading',
      }),
    ).toBe(true)
  })
})

describe('startup loading copy', () => {
  it('shows first-stage headline while questionGenActive', () => {
    expect(
      getStartupLoadingExplanation({
        questionGenActive: true,
        startupStep: 'fetching_interview',
        audioInitError: null,
        loadingMessage: 'x',
      }),
    ).toBe(getQuestionGenHeadline(0))
  })

  it('shows optimistic prepare subtext during generation', () => {
    expect(
      getStartupSubtext({
        questionGenActive: true,
        showRecovery: false,
        audioInitError: null,
      }),
    ).toBe(getQuestionGenSubtext())
    expect(getStartupSubtext({
      questionGenActive: true,
      showRecovery: false,
      audioInitError: null,
    })).not.toContain('minute')
  })

  it('advances question-gen stages over time', () => {
    expect(getQuestionGenStageIndex(0)).toBe(0)
    expect(getQuestionGenStageIndex(QUESTION_GEN_STAGE_DURATION_MS - 1)).toBe(0)
    expect(getQuestionGenStageIndex(QUESTION_GEN_STAGE_DURATION_MS)).toBe(1)
    expect(getQuestionGenStageIndex(QUESTION_GEN_STAGE_DURATION_MS * 10)).toBe(3)
  })

  it('hides subtext when audio init failed', () => {
    expect(
      getStartupSubtext({
        questionGenActive: false,
        showRecovery: false,
        audioInitError: 'Web Audio missing',
      }),
    ).toBeNull()
  })
})

describe('failure classification', () => {
  it('classifies prepare poll timeout', () => {
    expect(
      classifyPrepareError('Question generation is taking longer than expected. Please retry.'),
    ).toBe('prepare_timeout')
  })

  it('classifies network prepare errors', () => {
    expect(classifyPrepareError('Could not start question generation. Please retry.')).toBe('network')
  })

  it('classifies fetch load timeout', () => {
    expect(mapFetchErrorToFailureKind('Interview session took too long to load.')).toBe(
      'prepare_timeout',
    )
  })

  it('classifies generic backend errors', () => {
    expect(mapFetchErrorToFailureKind('Interviewer configuration is missing.')).toBe('backend')
  })
})

describe('computeStartupFunnel', () => {
  it('computes full-funnel conversion at 100%', () => {
    const stages = new Set<StartupStage>([
      'start_interview_clicked',
      'session_create_success',
      'first_question_received',
      'tts_started',
      'interview_ready',
    ])
    const funnel = computeStartupFunnel(stages)
    expect(funnel.conversion_pct.click_to_session).toBe(100)
    expect(funnel.conversion_pct.session_to_question).toBe(100)
    expect(funnel.conversion_pct.question_to_tts).toBe(100)
    expect(funnel.conversion_pct.tts_to_ready).toBe(100)
    expect(funnel.conversion_pct.click_to_ready).toBe(100)
  })

  it('reports 0% session_to_question when prepare never completes', () => {
    const funnel = computeStartupFunnel(
      new Set<StartupStage>(['start_interview_clicked', 'session_create_success']),
    )
    expect(funnel.conversion_pct.session_to_question).toBe(0)
    expect(funnel.question_ready).toBe(false)
  })

  it('treats tts_completed as first question played', () => {
    const funnel = computeStartupFunnel(
      new Set<StartupStage>(['first_question_received', 'tts_completed']),
    )
    expect(funnel.first_question_played).toBe(true)
  })
})

describe('InterviewStartupTimeline', () => {
  let origin: number
  let now: number

  beforeEach(() => {
    origin = 1000
    now = origin
    vi.stubGlobal('performance', { now: () => now })
    vi.stubGlobal('window', {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('records time_to_first_question and time_to_interview_ready', () => {
    const timeline = new InterviewStartupTimeline(origin)
    now = origin + 3200
    timeline.mark('first_question_received')
    now = origin + 8500
    timeline.mark('interview_ready')
    expect(timeline.getMetrics().time_to_first_question).toBe(3200)
    expect(timeline.getMetrics().time_to_interview_ready).toBe(8500)
  })

  it('emits funnel report at interview_ready', () => {
    const events: string[] = []
    const timeline = new InterviewStartupTimeline(origin)
    timeline.bind('id-1', (_t, event) => {
      events.push(event)
    })
    timeline.mark('start_interview_clicked')
    timeline.mark('session_create_success')
    timeline.mark('first_question_received')
    timeline.mark('tts_started')
    timeline.mark('interview_ready')
    expect(events).toContain('startup_funnel_report')
    expect(timeline.getFunnelReport().interview_ready).toBe(true)
  })

  it('records deepgram token failure stage', () => {
    const timeline = new InterviewStartupTimeline(origin)
    timeline.mark('deepgram_token_requested')
    timeline.mark('deepgram_token_failed', { error: '503' })
    expect(timeline.getCompletedStages().has('deepgram_token_failed')).toBe(true)
  })

  it('records deepgram websocket failure stage', () => {
    const timeline = new InterviewStartupTimeline(origin)
    timeline.mark('deepgram_connect_started')
    timeline.mark('deepgram_connect_failed', { error: 'socket closed' })
    expect(timeline.getCompletedStages().has('deepgram_connect_failed')).toBe(true)
  })

  it('records audio unlock failure', () => {
    const timeline = new InterviewStartupTimeline(origin)
    timeline.mark('audio_unlock_failed', { error: 'gesture required' })
    expect(timeline.getCompletedStages().has('audio_unlock_failed')).toBe(true)
  })

  it('reset clears stages for retry', () => {
    const timeline = new InterviewStartupTimeline(origin)
    timeline.mark('first_question_timeout')
    timeline.reset()
    expect(timeline.getCompletedStages().has('first_question_timeout')).toBe(false)
  })
})

describe('runStartInterviewWithTelemetry', () => {
  beforeEach(() => {
    vi.stubGlobal('performance', { now: () => 1000 })
    vi.stubGlobal('window', {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('marks success path through session create', async () => {
    const events: string[] = []
    const result = await runStartInterviewWithTelemetry({
      track: ((_t, event) => {
        events.push(event)
      }) as never,
      unlockAudio: () => {},
      createSession: async () => ({ ok: true, interviewId: 'abc', preparing: true }),
    })
    expect(result.ok).toBe(true)
    expect(events).toContain('session_create_success')
  })

  it('marks session_create_failed on API error (500 body)', async () => {
    const events: string[] = []
    const result = await runStartInterviewWithTelemetry({
      track: ((_t, event) => {
        events.push(event)
      }) as never,
      unlockAudio: () => {},
      createSession: async () => ({ ok: false, error: 'Internal server error' }),
    })
    expect(result.ok).toBe(false)
    expect(events).toContain('session_create_failed')
  })

  it('marks session_create_failed on network timeout', async () => {
    const events: string[] = []
    const result = await runStartInterviewWithTelemetry({
      track: ((_t, event) => {
        events.push(event)
      }) as never,
      unlockAudio: () => {},
      createSession: async () => {
        throw new Error('The operation was aborted')
      },
    })
    expect(result.ok).toBe(false)
    expect(events).toContain('session_create_failed')
  })

  it('marks audio_unlock_failed when unlock throws', async () => {
    const events: string[] = []
    await runStartInterviewWithTelemetry({
      track: ((_t, event) => {
        events.push(event)
      }) as never,
      unlockAudio: () => {
        throw new Error('AudioContext blocked')
      },
      createSession: async () => ({ ok: true, interviewId: 'x' }),
    })
    expect(events).toContain('audio_unlock_failed')
    expect(events).not.toContain('audio_unlock_success')
  })
})

describe('startup recovery simulations', () => {
  beforeEach(() => {
    vi.stubGlobal('performance', { now: () => 1000 })
    vi.stubGlobal('window', {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('retry success clears prior timeout stage', () => {
    const timeline = new InterviewStartupTimeline(1000)
    timeline.mark('first_question_timeout')
    timeline.reset()
    timeline.mark('first_question_received')
    timeline.mark('interview_ready')
    expect(timeline.getCompletedStages().has('first_question_timeout')).toBe(false)
    expect(timeline.getFunnelReport().interview_ready).toBe(true)
  })

  it('retry failure retains session_create_failed', () => {
    const timeline = new InterviewStartupTimeline(1000)
    timeline.mark('session_create_failed', { error: '500' })
    timeline.reset()
    timeline.mark('session_create_failed', { error: '500' })
    expect(timeline.getCompletedStages().has('session_create_failed')).toBe(true)
    expect(timeline.getFunnelReport().session_created).toBe(false)
  })

  it('reconnect success reaches question_ready', () => {
    const timeline = new InterviewStartupTimeline(1000)
    timeline.mark('session_create_started', { source: 'reconnect' })
    timeline.mark('session_create_success', { source: 'reconnect' })
    timeline.mark('first_question_received')
    expect(timeline.getFunnelReport().question_ready).toBe(true)
  })

  it('reconnect failure stops at session_create_failed', () => {
    const timeline = new InterviewStartupTimeline(1000)
    timeline.mark('session_create_started', { source: 'reconnect' })
    timeline.mark('session_create_failed', { error: 'prepare failed' })
    expect(timeline.getFunnelReport().question_ready).toBe(false)
  })

  it('question generation >20s should not imply failure while gen active (policy)', () => {
    expect(getStartupWatchdogDelayMs(true)).toBeGreaterThan(20_000)
    expect(
      shouldShowStartupRecovery({
        questionGenActive: true,
        showTimeoutRecovery: true,
        confirmedFailure: 'none',
        phase: 'loading',
      }),
    ).toBe(false)
  })

  it('question generation >60s uses prepare client ceiling', () => {
    expect(PREPARE_CLIENT_TIMEOUT_MS).toBeGreaterThanOrEqual(60_000)
  })
})
