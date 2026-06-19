import { describe, expect, it, beforeEach } from 'vitest'
import {
  VoiceSessionOrchestrator,
  type AudioControl,
  type SttControl,
  type TtsControl,
  type Scheduler,
  type SchedulerHandle,
} from '@/lib/voice/orchestrator/voice-session-orchestrator'
import type {
  ConversationEngine,
  NextTurnResult,
  ScoredAnswer,
} from '@/lib/voice/conversation/conversation-engine'
import type { TTSOptions } from '@/lib/voice/tts-client'

const flush = () => new Promise((r) => setTimeout(r, 0))
const VOICE: TTSOptions = { voice: 'female', tone: 'neutral' }

class FakeAudio implements AudioControl {
  initCount = 0
  enableCount = 0
  disableCount = 0
  disposeCount = 0
  micReady = true
  pcm: ((f: ArrayBuffer) => void) | null = null
  async initialize() {
    this.initCount++
  }
  async enableMic() {
    this.enableCount++
    return this.micReady
  }
  disableMic() {
    this.disableCount++
  }
  setPcmConsumer(c: ((f: ArrayBuffer) => void) | null) {
    this.pcm = c
  }
  setContext() {}
  async dispose() {
    this.disposeCount++
  }
}

class FakeStt implements SttControl {
  startCount = 0
  resumeCount = 0
  pauseCount = 0
  resetCount = 0
  disposeCount = 0
  transcript = 'this is my answer'
  cb: {
    onAnswerReady?: (t: string) => void
    onError?: (m: string, e: 'deepgram' | 'browser') => void
  } = {}
  async start() {
    this.startCount++
  }
  resume() {
    this.resumeCount++
  }
  pause() {
    this.pauseCount++
  }
  resetTurn() {
    this.resetCount++
  }
  getMergedTranscript() {
    return this.transcript
  }
  sendAudio() {}
  setCallbacks(cb: typeof this.cb) {
    this.cb = { ...this.cb, ...cb }
  }
  async dispose() {
    this.disposeCount++
  }
  triggerVad(text?: string) {
    this.cb.onAnswerReady?.(text ?? this.transcript)
  }
}

class FakeTts implements TtsControl {
  spoken: string[] = []
  cancelCount = 0
  disposeCount = 0
  private resolveSpeak: (() => void) | null = null
  private lastCbs: { onFallback?: (m: string) => void } | undefined
  async speak(text: string, _o: TTSOptions, cbs?: { onFallback?: (m: string) => void }) {
    this.spoken.push(text)
    this.lastCbs = cbs
    return new Promise<void>((resolve) => {
      this.resolveSpeak = resolve
    })
  }
  cancel() {
    this.cancelCount++
    const r = this.resolveSpeak
    this.resolveSpeak = null
    r?.()
  }
  setContext() {}
  async dispose() {
    this.disposeCount++
  }
  completeSpeak() {
    const r = this.resolveSpeak
    this.resolveSpeak = null
    r?.()
  }
  triggerFallback(msg = 'quota') {
    this.lastCbs?.onFallback?.(msg)
    this.completeSpeak()
  }
}

class FakeConversation implements ConversationEngine {
  score: ScoredAnswer = { overallScore: 7 }
  scoreError: Error | null = null
  queue: NextTurnResult[] = []
  manual = false
  private scoreResolvers: Array<(v: ScoredAnswer) => void> = []
  async scoreAnswer(): Promise<ScoredAnswer> {
    if (this.scoreError) throw this.scoreError
    if (this.manual) return new Promise<ScoredAnswer>((res) => this.scoreResolvers.push(res))
    return this.score
  }
  async resolveNextTurn(): Promise<NextTurnResult> {
    return this.queue.shift() ?? { done: true, reportId: 'rep-final' }
  }
  resolveScore(v?: ScoredAnswer) {
    this.scoreResolvers.shift()?.(v ?? this.score)
  }
}

class FakeScheduler implements Scheduler {
  private counter = 0
  pending: Array<{ id: number; fn: () => void }> = []
  setTimeout(fn: () => void): SchedulerHandle {
    const id = ++this.counter
    this.pending.push({ id, fn })
    return { id }
  }
  clearTimeout(h: SchedulerHandle | null) {
    if (!h) return
    this.pending = this.pending.filter((p) => p.id !== h.id)
  }
  fireAll() {
    const ps = this.pending
    this.pending = []
    ps.forEach((p) => p.fn())
  }
}

function setup() {
  const audio = new FakeAudio()
  const stt = new FakeStt()
  const tts = new FakeTts()
  const conversation = new FakeConversation()
  const scheduler = new FakeScheduler()
  const orch = new VoiceSessionOrchestrator({
    interviewId: 'iv1',
    audio,
    stt,
    tts,
    conversation,
    voiceOptions: VOICE,
    firstQuestion: { text: 'Q1 tell me about yourself', questionIndex: 0, isFollowUp: false },
    scheduler,
    answerTimeoutMs: 60_000,
  })
  return { audio, stt, tts, conversation, scheduler, orch }
}

describe('VoiceSessionOrchestrator', () => {
  let h: ReturnType<typeof setup>
  beforeEach(() => {
    h = setup()
  })

  it('starts: initializes once, opens STT, asks the first question', async () => {
    void h.orch.start()
    await flush()
    expect(h.audio.initCount).toBe(1)
    expect(h.stt.startCount).toBe(1)
    expect(h.orch.getState()).toBe('interviewer_speaking')
    expect(h.tts.spoken).toEqual(['Q1 tell me about yourself'])
  })

  it('opens the mic window after the question finishes speaking', async () => {
    void h.orch.start()
    await flush()
    h.tts.completeSpeak()
    await flush()
    expect(h.orch.getState()).toBe('listening')
    expect(h.audio.enableCount).toBe(1)
    expect(h.stt.resumeCount).toBe(1)
    expect(h.scheduler.pending.length).toBe(1) // answer timer armed
  })

  it('runs a full multi-question interview to completion', async () => {
    h.conversation.queue = [
      { done: false, question: { text: 'Q2 hardest bug', questionIndex: 1, isFollowUp: false } },
      { done: true, reportId: 'rep-final' },
    ]
    void h.orch.start()
    await flush()
    h.tts.completeSpeak() // Q1 done → listening
    await flush()

    h.stt.triggerVad('my first answer')
    await flush()
    expect(h.orch.getState()).toBe('interviewer_speaking')
    expect(h.tts.spoken).toEqual(['Q1 tell me about yourself', 'Q2 hardest bug'])
    expect(h.audio.initCount).toBe(1) // MIC ACQUIRED ONCE

    h.tts.completeSpeak() // Q2 done → listening
    await flush()
    expect(h.orch.getState()).toBe('listening')
    expect(h.audio.enableCount).toBe(2) // re-gated, not re-acquired

    h.stt.triggerVad('my second answer')
    await flush()
    expect(h.orch.getState()).toBe('completed')
    expect(h.orch.getSnapshot().reportId).toBe('rep-final')
  })

  it('auto-submits when the answer timer fires', async () => {
    const sources: string[] = []
    void h.orch.start()
    await flush()
    h.orch.getEventBus().on('AnswerSubmitted', (e) => sources.push(e.payload.source))
    h.tts.completeSpeak()
    await flush()
    expect(h.orch.getState()).toBe('listening')
    h.scheduler.fireAll() // answer timeout
    await flush()
    expect(sources).toContain('timer')
    expect(h.orch.getState()).toBe('completed') // default resolveNextTurn → done
  })

  it('ignores submitAnswer when not listening', async () => {
    void h.orch.start()
    await flush()
    expect(h.orch.getState()).toBe('interviewer_speaking')
    await h.orch.submitAnswer('button')
    expect(h.orch.getState()).toBe('interviewer_speaking') // unchanged
  })

  it('flags TTS degradation on fallback but still proceeds to listen', async () => {
    void h.orch.start()
    await flush()
    h.tts.triggerFallback('quota exhausted')
    await flush()
    expect(h.orch.getState()).toBe('listening')
    expect(h.orch.getSnapshot().ttsDegraded).toBe(true)
  })

  it('fails into error on scoring error and recovers by re-asking', async () => {
    h.conversation.scoreError = new Error('LLM down')
    void h.orch.start()
    await flush()
    h.tts.completeSpeak()
    await flush()
    h.stt.triggerVad('answer')
    await flush()
    expect(h.orch.getState()).toBe('error')
    expect(h.orch.getSnapshot().lastError).toBe('LLM down')

    h.conversation.scoreError = null
    void h.orch.recover()
    await flush()
    expect(h.orch.getState()).toBe('interviewer_speaking')
    // re-asked the same (first) question
    expect(h.tts.spoken[h.tts.spoken.length - 1]).toBe('Q1 tell me about yourself')
  })

  it('drops stale results when disposed mid-processing', async () => {
    h.conversation.manual = true
    void h.orch.start()
    await flush()
    h.tts.completeSpeak()
    await flush()
    h.stt.triggerVad('answer')
    await flush()
    expect(h.orch.getState()).toBe('processing_answer')

    await h.orch.dispose()
    expect(h.orch.getState()).toBe('destroyed')

    // Late LLM result must not resurrect the session.
    h.conversation.resolveScore()
    await flush()
    expect(h.orch.getState()).toBe('destroyed')
  })

  it('disposes deterministically and is idempotent', async () => {
    void h.orch.start()
    await flush()
    await h.orch.dispose()
    await h.orch.dispose()
    expect(h.orch.getState()).toBe('destroyed')
    expect(h.audio.disposeCount).toBe(1)
    expect(h.stt.disposeCount).toBe(1)
    expect(h.tts.disposeCount).toBe(1)
  })

  it('fails the session if the mic cannot be enabled', async () => {
    h.audio.micReady = false
    void h.orch.start()
    await flush()
    h.tts.completeSpeak()
    await flush()
    expect(h.orch.getState()).toBe('error')
  })
})
