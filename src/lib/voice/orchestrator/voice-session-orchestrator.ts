/**
 * VoiceSessionOrchestrator — THE single authoritative owner of a voice
 * interview session (audit Phase 1/3). It wires the deterministic FSM, the
 * AudioSessionManager, the SttPipeline, the TtsPipeline, the ConversationEngine
 * and the event bus into one coherent, persistent session.
 *
 * Design guarantees:
 *  - One owner: nothing else drives audio/STT/TTS; callers only call
 *    `start()`, `submitAnswer()`, `dispose()` and read snapshots.
 *  - Persistent session (Phase 3): mic + STT connection are created ONCE in
 *    `start()` and kept alive; turns gate them (enableMic/resume ↔
 *    disableMic/pause), never recreate them.
 *  - Deterministic flow (Phase 2): every step is an FSM transition; illegal
 *    signals are no-ops. A per-turn token drops stale async results so a
 *    superseded turn (destroy / next question) can never mutate live state.
 *  - Timeout-protected (Phase 9): an answer window and the LLM steps are
 *    watchdog-bounded; expiry drives a legal transition, never a hang.
 *
 * Framework-agnostic and unit-testable: every collaborator is an injected
 * interface, and timers go through an injected scheduler.
 */
import {
  VoiceSessionStateMachine,
} from '@/lib/voice/core/state-machine'
import type { VoiceSessionState } from '@/lib/voice/core/session-state'
import { VoiceEventBus } from '@/lib/voice/core/event-bus'
import {
  createSessionId,
  createTurnContext,
  type SessionId,
  type TurnContext,
} from '@/lib/voice/core/ids'
import { createVoiceLogger, type VoiceLogger } from '@/lib/voice/core/observability'
import type { TTSOptions } from '@/lib/voice/tts-client'
import type {
  ConversationEngine,
  NextQuestion,
  ScoredAnswer,
} from '@/lib/voice/conversation/conversation-engine'

/** Narrow control surfaces (Interface Segregation) — concrete managers satisfy these structurally. */
export interface AudioControl {
  initialize(): Promise<void>
  enableMic(): Promise<boolean>
  disableMic(): void
  setPcmConsumer(consumer: ((frame: ArrayBuffer) => void) | null): void
  setContext?(ctx: TurnContext | null): void
  dispose(reason?: string): Promise<void>
}

export interface SttControl {
  start(opts?: { ctx?: TurnContext | null }): Promise<void>
  resume(): void
  pause(): void
  resetTurn(): void
  getMergedTranscript(): string
  sendAudio(frame: ArrayBuffer): void
  setCallbacks(cb: {
    onAnswerReady?: (text: string) => void
    onListening?: (engine: 'deepgram' | 'browser') => void
    onError?: (message: string, engine: 'deepgram' | 'browser') => void
  }): void
  dispose(): Promise<void>
}

export interface TtsControl {
  speak(
    text: string,
    options: TTSOptions,
    callbacks?: {
      onStart?: () => void
      onComplete?: () => void
      onFallback?: (message: string) => void
      onError?: (message: string) => void
    },
  ): Promise<void>
  cancel(): void
  setContext?(ctx: TurnContext | null): void
  dispose(): Promise<void>
}

export interface SchedulerHandle {
  readonly id: unknown
}
export interface Scheduler {
  setTimeout(fn: () => void, ms: number): SchedulerHandle
  clearTimeout(handle: SchedulerHandle | null): void
}

const realScheduler: Scheduler = {
  setTimeout: (fn, ms) => ({ id: setTimeout(fn, ms) }),
  clearTimeout: (h) => {
    if (h) clearTimeout(h.id as ReturnType<typeof setTimeout>)
  },
}

export type AnswerSource = 'vad' | 'timer' | 'button' | 'watchdog'

export interface OrchestratorSnapshot {
  state: VoiceSessionState
  sessionId: SessionId | null
  questionIndex: number
  isFollowUp: boolean
  questionText: string
  transcript: string
  ttsDegraded: boolean
  lastError: string | null
  reportId: string | null
}

export interface VoiceSessionOrchestratorConfig {
  interviewId: string
  audio: AudioControl
  stt: SttControl
  tts: TtsControl
  conversation: ConversationEngine
  voiceOptions: TTSOptions
  firstQuestion: NextQuestion
  bus?: VoiceEventBus
  logger?: VoiceLogger
  scheduler?: Scheduler
  /** Max time a candidate may answer one question (ms). Default 60s. */
  answerTimeoutMs?: number
  /** Watchdog for each LLM step (ms). Default 55s — aligned with /complete budget. */
  processingTimeoutMs?: number
}

const DEFAULT_ANSWER_TIMEOUT = 60_000
/** Matches server /complete maxDuration (60s) minus client fetch overhead. */
const DEFAULT_PROCESSING_TIMEOUT = 55_000

export class VoiceSessionOrchestrator {
  private readonly cfg: VoiceSessionOrchestratorConfig
  private readonly fsm: VoiceSessionStateMachine
  private readonly bus: VoiceEventBus
  private readonly logger: VoiceLogger
  private readonly scheduler: Scheduler

  private sessionId: SessionId | null = null
  private currentCtx: TurnContext | null = null
  private currentQuestion: NextQuestion
  private lastScore: ScoredAnswer | null = null

  /** Monotonic turn token — captured by async ops to detect supersession. */
  private turnSeq = 0
  private answerTimer: SchedulerHandle | null = null
  private processingTimer: SchedulerHandle | null = null

  private ttsDegraded = false
  private lastError: string | null = null
  private reportId: string | null = null
  private startInFlight = false
  private started = false

  constructor(config: VoiceSessionOrchestratorConfig) {
    this.cfg = config
    this.bus = config.bus ?? new VoiceEventBus()
    this.logger = config.logger ?? createVoiceLogger('orchestrator')
    this.scheduler = config.scheduler ?? realScheduler
    this.fsm = new VoiceSessionStateMachine({ bus: this.bus, logger: this.logger })
    this.currentQuestion = config.firstQuestion
  }

  getState(): VoiceSessionState {
    return this.fsm.getState()
  }

  getEventBus(): VoiceEventBus {
    return this.bus
  }

  getSnapshot(): OrchestratorSnapshot {
    return {
      state: this.fsm.getState(),
      sessionId: this.sessionId,
      questionIndex: this.currentQuestion.questionIndex,
      isFollowUp: this.currentQuestion.isFollowUp,
      questionText: this.currentQuestion.text,
      transcript: this.cfg.stt.getMergedTranscript(),
      ttsDegraded: this.ttsDegraded,
      lastError: this.lastError,
      reportId: this.reportId,
    }
  }

  /**
   * Bring the session up ONCE: acquire mic, open STT, then ask the first
   * question. Idempotent — repeated calls are ignored.
   */
  async start(): Promise<void> {
    if (this.started || this.startInFlight) return
    this.startInFlight = true
    try {
      this.fsm.send('INITIALIZE')
      this.sessionId = createSessionId()
      this.bus.emit('InterviewStarted', { interviewId: this.cfg.interviewId })

      // Persistent wiring: mic PCM → STT (gated by the manager + pipeline).
      this.cfg.audio.setPcmConsumer((frame) => this.cfg.stt.sendAudio(frame))
      this.cfg.stt.setCallbacks({
        onAnswerReady: (text) => this.onAnswerReady(text),
        onError: (message, engine) => this.onSttError(message, engine),
      })

      await this.cfg.audio.initialize()
      // Persistent STT connection — opened once, gated per turn thereafter.
      await this.cfg.stt.start({ ctx: null })

      if (this.fsm.getState() === 'destroyed') return
      this.fsm.send('READY')
      this.started = true

      await this.enterSpeaking(this.cfg.firstQuestion, 'SPEAK')
    } catch (err) {
      this.fail(err instanceof Error ? err.message : String(err))
    } finally {
      this.startInFlight = false
    }
  }

  /** Transition into interviewer_speaking and speak the question. */
  private async enterSpeaking(
    question: NextQuestion,
    via: 'SPEAK' | 'RESPONSE_READY' | 'RECOVER_SPEAK',
  ): Promise<void> {
    this.currentQuestion = question
    const ctx = createTurnContext({
      interviewId: this.cfg.interviewId,
      sessionId: this.sessionId as SessionId,
      questionIndex: question.questionIndex,
      isFollowUp: question.isFollowUp,
    })
    this.currentCtx = ctx
    const myTurn = ++this.turnSeq
    this.cfg.conversation.abort?.()

    this.cfg.audio.setContext?.(ctx)
    this.cfg.tts.setContext?.(ctx)

    if (!this.fsm.send(via, ctx)) return // illegal from current state — abort

    this.bus.emit('QuestionGenerated', {
      questionIndex: question.questionIndex,
      isFollowUp: question.isFollowUp,
      text: question.text,
    }, { ctx })

    // Drive the next step off the awaited promise (single path); a superseded
    // utterance resolves early and the turn guard drops it.
    await this.cfg.tts.speak(question.text, this.cfg.voiceOptions, {
      onFallback: () => {
        this.ttsDegraded = true
      },
    })
    if (myTurn !== this.turnSeq) return
    if (this.fsm.getState() !== 'interviewer_speaking') return

    await this.beginListening(myTurn)
  }

  /** interviewer_speaking → preparing_listening → listening, opening the mic window. */
  private async beginListening(myTurn: number): Promise<void> {
    if (!this.fsm.send('SPEECH_FINISHED', this.currentCtx)) return

    this.cfg.stt.resetTurn()
    const micReady = await this.cfg.audio.enableMic()
    if (myTurn !== this.turnSeq) return
    if (!micReady) {
      this.fail('Microphone unavailable.')
      return
    }
    this.cfg.stt.resume()

    if (!this.fsm.send('LISTENING_STARTED', this.currentCtx)) return
    this.bus.emit('ListeningStarted', { engine: 'deepgram' }, { ctx: this.currentCtx })
    this.startAnswerTimer(myTurn)
  }

  private startAnswerTimer(myTurn: number): void {
    this.clearAnswerTimer()
    const ms = this.cfg.answerTimeoutMs ?? DEFAULT_ANSWER_TIMEOUT
    this.answerTimer = this.scheduler.setTimeout(() => {
      if (myTurn !== this.turnSeq) return
      if (this.fsm.getState() !== 'listening') return
      this.logger.info('answer_timeout', this.currentCtx, {})
      void this.submitAnswer('timer')
    }, ms)
  }

  private clearAnswerTimer(): void {
    this.scheduler.clearTimeout(this.answerTimer)
    this.answerTimer = null
  }

  /** STT VAD signalled end-of-utterance. */
  private onAnswerReady(text: string): void {
    if (this.fsm.getState() !== 'listening') return
    if (!text.trim()) return
    void this.submitAnswer('vad')
  }

  /**
   * Submit the current answer (VAD, timer, or explicit button). Only valid
   * while listening; subsequent calls for the same turn are no-ops.
   */
  async submitAnswer(source: AnswerSource): Promise<void> {
    if (this.fsm.getState() !== 'listening') return
    const myTurn = this.turnSeq
    this.clearAnswerTimer()

    const answerText = this.cfg.stt.getMergedTranscript().trim()
    this.cfg.stt.pause()
    this.cfg.audio.disableMic()

    if (!this.fsm.send('ANSWER_SUBMITTED', this.currentCtx)) return
    this.bus.emit('AnswerSubmitted', { source, chars: answerText.length }, { ctx: this.currentCtx })

    await this.processAnswer(answerText, myTurn)
  }

  private async processAnswer(answerText: string, myTurn: number): Promise<void> {
    const ctx = this.currentCtx
    if (!ctx) return
    this.startProcessingWatchdog(myTurn)
    try {
      this.bus.emit('LLMStarted', { kind: 'score' }, { ctx })
      const t0 = Date.now()
      const score = await this.cfg.conversation.scoreAnswer({ ctx, answerText })
      if (myTurn !== this.turnSeq) return
      this.lastScore = score
      this.bus.emit('LLMCompleted', { kind: 'score', latencyMs: Date.now() - t0, ok: true }, { ctx })

      if (!this.fsm.send('SCORED', ctx)) return

      this.bus.emit('LLMStarted', { kind: 'process' }, { ctx })
      const t1 = Date.now()
      const next = await this.cfg.conversation.resolveNextTurn({ ctx, lastScore: score })
      if (myTurn !== this.turnSeq) return
      this.bus.emit('LLMCompleted', { kind: 'process', latencyMs: Date.now() - t1, ok: true }, { ctx })
      this.clearProcessingWatchdog()

      if (next.done || !next.question) {
        this.reportId = next.reportId ?? null
        if (this.fsm.send('INTERVIEW_DONE', ctx)) {
          this.bus.emit('InterviewCompleted', {
            reportId: this.reportId,
            retention: next.completion?.retention ?? null,
            funnelComplete: next.completion?.funnelComplete ?? null,
            badgesUnlocked: next.completion?.badgesUnlocked ?? [],
          }, { ctx })
          await this.quiesce('completed')
        }
        return
      }

      await this.enterSpeaking(next.question, 'RESPONSE_READY')
    } catch (err) {
      if (myTurn !== this.turnSeq) return
      this.clearProcessingWatchdog()
      if (err instanceof DOMException && err.name === 'AbortError') return
      this.fail(err instanceof Error ? err.message : String(err))
    }
  }

  private startProcessingWatchdog(myTurn: number): void {
    this.clearProcessingWatchdog()
    const ms = this.cfg.processingTimeoutMs ?? DEFAULT_PROCESSING_TIMEOUT
    this.processingTimer = this.scheduler.setTimeout(() => {
      if (myTurn !== this.turnSeq) return
      const s = this.fsm.getState()
      if (s !== 'processing_answer' && s !== 'generating_response') return
      this.logger.error('processing_watchdog', this.currentCtx, {})
      this.fail('AI is taking too long. Please try again.')
    }, ms)
  }

  private clearProcessingWatchdog(): void {
    this.scheduler.clearTimeout(this.processingTimer)
    this.processingTimer = null
  }

  private onSttError(message: string, engine: 'deepgram' | 'browser'): void {
    this.logger.error('stt_error', this.currentCtx, { message, engine })
    this.lastError = message
    // STT errors do not by themselves end the turn; surface via bus for the UI.
    this.bus.emit('Error', { scope: 'stt', message }, { ctx: this.currentCtx })
  }

  /** Move to a recoverable error state and stop audio/listening. */
  private fail(message: string): void {
    this.lastError = message
    this.clearAnswerTimer()
    this.clearProcessingWatchdog()
    this.turnSeq++ // invalidate in-flight async for this turn
    this.cfg.conversation.abort?.()
    this.cfg.tts.cancel()
    this.cfg.stt.pause()
    this.cfg.audio.disableMic()
    if (this.fsm.send('FAIL', this.currentCtx)) {
      this.bus.emit('Error', { scope: 'session', message }, { ctx: this.currentCtx })
    }
  }

  /**
   * Recover from `error`: re-ask the current question. Caller (UI) invokes this
   * from an explicit "Retry" affordance.
   */
  async recover(): Promise<void> {
    if (this.fsm.getState() !== 'error') return
    await this.enterSpeaking(this.currentQuestion, 'RECOVER_SPEAK')
  }

  /** Stop listening/speaking after completion without destroying (report view). */
  private async quiesce(_reason: string): Promise<void> {
    this.clearAnswerTimer()
    this.clearProcessingWatchdog()
    this.cfg.tts.cancel()
    this.cfg.stt.pause()
    this.cfg.audio.disableMic()
  }

  /** Deterministic, idempotent teardown of the whole session. */
  async dispose(reason = 'dispose'): Promise<void> {
    if (this.fsm.getState() === 'destroyed') return
    this.turnSeq++
    this.cfg.conversation.abort?.()
    this.clearAnswerTimer()
    this.clearProcessingWatchdog()
    this.fsm.send('DESTROY', this.currentCtx)
    this.bus.emit('InterviewDestroyed', { reason }, { ctx: this.currentCtx })

    this.cfg.audio.setPcmConsumer(null)
    try {
      this.cfg.tts.cancel()
    } catch {
      /* */
    }
    await Promise.allSettled([
      this.cfg.tts.dispose(),
      this.cfg.stt.dispose(),
      this.cfg.audio.dispose(reason),
    ])
    this.cfg.conversation.abort?.()
    this.fsm.dispose()
    this.logger.info('session_disposed', this.currentCtx, { reason })
  }
}
