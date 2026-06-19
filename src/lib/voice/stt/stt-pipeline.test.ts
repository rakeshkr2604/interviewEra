import { describe, expect, it, vi, beforeEach } from 'vitest'
import { SttPipeline } from '@/lib/voice/stt/stt-pipeline'
import type {
  SttTransport,
  SttTransportCallbacks,
  SttEngineKind,
} from '@/lib/voice/stt/stt-transport'

class FakeTransport implements SttTransport {
  readonly kind: SttEngineKind
  callbacks: SttTransportCallbacks | null = null
  started = false
  stopped = false
  sent: ArrayBuffer[] = []

  constructor(kind: SttEngineKind) {
    this.kind = kind
  }
  async start(callbacks: SttTransportCallbacks): Promise<void> {
    this.callbacks = callbacks
    this.started = true
  }
  sendAudio(frame: ArrayBuffer): void {
    this.sent.push(frame)
  }
  stop(): void {
    this.stopped = true
  }
  // helpers
  open() {
    this.callbacks?.onOpen()
  }
  partial(t: string) {
    this.callbacks?.onPartial(t)
  }
  finalSeg(t: string) {
    this.callbacks?.onFinalSegment(t)
  }
  utteranceEnd(t: string) {
    this.callbacks?.onUtteranceEnd(t)
  }
  error(msg: string) {
    this.callbacks?.onError(new Error(msg))
  }
}

function makePipeline() {
  const created: FakeTransport[] = []
  const factory = (kind: SttEngineKind) => {
    const t = new FakeTransport(kind)
    created.push(t)
    return t
  }
  const onAnswerReady = vi.fn()
  const onListening = vi.fn()
  const onError = vi.fn()
  const pipeline = new SttPipeline({
    transportFactory: factory,
    callbacks: { onAnswerReady, onListening, onError },
  })
  return { pipeline, created, onAnswerReady, onListening, onError }
}

describe('SttPipeline', () => {
  let h: ReturnType<typeof makePipeline>
  beforeEach(() => {
    h = makePipeline()
  })

  it('defaults to the deepgram engine, never the browser', async () => {
    await h.pipeline.start()
    expect(h.pipeline.getEngine()).toBe('deepgram')
    expect(h.created[0].kind).toBe('deepgram')
  })

  it('enforces a single active engine — start() tears down the prior transport', async () => {
    await h.pipeline.start()
    const first = h.created[0]
    await h.pipeline.start()
    expect(first.stopped).toBe(true)
    expect(h.created).toHaveLength(2)
    expect(h.pipeline.isActive()).toBe(true)
  })

  it('gates audio frames behind resume()/pause()', async () => {
    await h.pipeline.start()
    const t = h.created[0]
    h.pipeline.sendAudio(new ArrayBuffer(4))
    expect(t.sent).toHaveLength(0) // paused by default

    h.pipeline.resume()
    h.pipeline.sendAudio(new ArrayBuffer(4))
    expect(t.sent).toHaveLength(1)

    h.pipeline.pause()
    h.pipeline.sendAudio(new ArrayBuffer(4))
    expect(t.sent).toHaveLength(1)
  })

  it('does not tear down the transport on pause (persistent session)', async () => {
    await h.pipeline.start()
    const t = h.created[0]
    h.pipeline.resume()
    h.pipeline.pause()
    expect(t.stopped).toBe(false)
    expect(h.pipeline.isActive()).toBe(true)
  })

  it('assembles transcript and fires onAnswerReady on utterance end', async () => {
    await h.pipeline.start()
    const t = h.created[0]
    t.open()
    t.partial('I worked')
    t.finalSeg('I worked on a payments service')
    t.utteranceEnd('')
    expect(h.onAnswerReady).toHaveBeenCalledWith('I worked on a payments service')
  })

  it('fires onListening when the engine opens', async () => {
    await h.pipeline.start()
    h.created[0].open()
    expect(h.onListening).toHaveBeenCalledWith('deepgram')
  })

  it('ignores callbacks from a superseded transport (no stale transcripts)', async () => {
    await h.pipeline.start()
    const first = h.created[0]
    await h.pipeline.start() // supersede
    first.utteranceEnd('stale answer from old engine')
    first.partial('stale interim')
    expect(h.onAnswerReady).not.toHaveBeenCalled()
    expect(h.pipeline.getMergedTranscript()).toBe('')
  })

  it('resets transcript per turn but can preserve across restart', async () => {
    await h.pipeline.start()
    h.created[0].finalSeg('answer one')
    await h.pipeline.start({ preserveTranscript: true })
    expect(h.pipeline.getMergedTranscript()).toBe('answer one')
    await h.pipeline.start() // default resets
    expect(h.pipeline.getMergedTranscript()).toBe('')
  })

  it('switchToFallback uses the browser engine explicitly and preserves text', async () => {
    await h.pipeline.start()
    h.created[0].finalSeg('partial answer')
    await h.pipeline.switchToFallback()
    expect(h.pipeline.getEngine()).toBe('browser')
    expect(h.created[h.created.length - 1].kind).toBe('browser')
    expect(h.pipeline.getMergedTranscript()).toBe('partial answer')
  })

  it('surfaces transport errors via callback', async () => {
    await h.pipeline.start()
    h.created[0].open()
    h.created[0].error('socket closed')
    expect(h.onError).toHaveBeenCalledWith('socket closed', 'deepgram')
  })

  it('stop() tears down transport but keeps transcript until resetTurn()', async () => {
    await h.pipeline.start()
    h.created[0].finalSeg('keep me')
    await h.pipeline.stop()
    expect(h.created[0].stopped).toBe(true)
    expect(h.pipeline.getMergedTranscript()).toBe('keep me')
    h.pipeline.resetTurn()
    expect(h.pipeline.getMergedTranscript()).toBe('')
  })

  it('dispose() stops and clears', async () => {
    await h.pipeline.start()
    h.created[0].finalSeg('bye')
    await h.pipeline.dispose()
    expect(h.created[0].stopped).toBe(true)
    expect(h.pipeline.getMergedTranscript()).toBe('')
    expect(h.pipeline.isActive()).toBe(false)
  })
})
