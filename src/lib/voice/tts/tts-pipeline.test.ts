import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  TtsPipeline,
  TtsFallbackError,
  type TtsSynthesizer,
  type TtsAudioSink,
  type TtsFallbackSpeaker,
} from '@/lib/voice/tts/tts-pipeline'
import type { AudioPlaybackCallbacks } from '@/lib/voice/audio/audio-driver'
import type { TTSOptions } from '@/lib/voice/tts-client'

const OPTS: TTSOptions = { voice: 'female', tone: 'neutral' }

/** Synthesizer whose per-chunk promises tests resolve/reject manually. */
class FakeSynth implements TtsSynthesizer {
  calls: Array<{ text: string; signal: AbortSignal }> = []
  private resolvers: Array<(buf: ArrayBuffer) => void> = []
  private rejecters: Array<(err: unknown) => void> = []
  aborted: boolean[] = []

  async speak(text: string, _options: TTSOptions, signal: AbortSignal): Promise<ArrayBuffer> {
    const idx = this.calls.length
    this.calls.push({ text, signal })
    this.aborted.push(false)
    signal.addEventListener('abort', () => {
      this.aborted[idx] = true
    })
    return new Promise<ArrayBuffer>((resolve, reject) => {
      this.resolvers[idx] = resolve
      this.rejecters[idx] = reject
    })
  }

  resolve(idx: number, bytes = 8) {
    this.resolvers[idx]?.(new ArrayBuffer(bytes))
  }
  reject(idx: number, err: unknown) {
    this.rejecters[idx]?.(err)
  }
}

/** Sink that records playback and lets tests complete each play. */
class FakeSink implements TtsAudioSink {
  played: ArrayBuffer[] = []
  stopCount = 0
  private pending: Array<() => void> = []

  async playAudio(buffer: ArrayBuffer, callbacks: AudioPlaybackCallbacks): Promise<void> {
    this.played.push(buffer)
    this.pending.push(() => callbacks.onPlaybackComplete?.())
  }
  stopAudio(): void {
    this.stopCount++
  }
  completeLatest() {
    const fn = this.pending.shift()
    fn?.()
  }
  completeAll() {
    while (this.pending.length) this.completeLatest()
  }
}

function setup(chunker?: (t: string) => string[], fallbackSpeaker?: TtsFallbackSpeaker) {
  const synth = new FakeSynth()
  const sink = new FakeSink()
  const pipeline = new TtsPipeline({ synthesizer: synth, sink, chunker, fallbackSpeaker })
  return { synth, sink, pipeline }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('TtsPipeline', () => {
  let h: ReturnType<typeof setup>
  beforeEach(() => {
    h = setup(() => ['only chunk'])
  })

  it('synthesizes and plays a single chunk to completion', async () => {
    const onComplete = vi.fn()
    const p = h.pipeline.speak('hello there', OPTS, { onComplete })
    await flush()
    expect(h.synth.calls[0].text).toBe('only chunk')
    h.synth.resolve(0)
    await flush()
    expect(h.sink.played).toHaveLength(1)
    h.sink.completeLatest()
    await p
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(h.pipeline.isSpeaking()).toBe(false)
  })

  it('ignores a duplicate request for the same text while speaking', async () => {
    h.pipeline.speak('hello there', OPTS)
    await flush()
    h.pipeline.speak('hello there', OPTS) // duplicate
    await flush()
    expect(h.synth.calls).toHaveLength(1)
  })

  it('supersedes a prior utterance: aborts fetch + stops audio', async () => {
    h.pipeline.speak('first question text', OPTS)
    await flush()
    expect(h.synth.aborted[0]).toBe(false)

    h.pipeline.speak('second question text', OPTS)
    await flush()
    expect(h.synth.aborted[0]).toBe(true) // first fetch aborted
    expect(h.sink.stopCount).toBeGreaterThanOrEqual(1) // audio stopped
    expect(h.synth.calls[1].text).toBe('only chunk')
  })

  it('does not fire onComplete for a superseded utterance', async () => {
    const onComplete = vi.fn()
    h.pipeline.speak('first', OPTS, { onComplete })
    await flush()
    h.pipeline.speak('second', OPTS)
    await flush()
    // resolve the OLD fetch — must be dropped
    h.synth.resolve(0)
    await flush()
    expect(onComplete).not.toHaveBeenCalled()
  })

  it('cancel() aborts in-flight fetch and stops audio immediately', async () => {
    h.pipeline.speak('a question', OPTS)
    await flush()
    h.pipeline.cancel()
    expect(h.synth.aborted[0]).toBe(true)
    expect(h.sink.stopCount).toBeGreaterThanOrEqual(1)
    expect(h.pipeline.isSpeaking()).toBe(false)
  })

  it('surfaces TtsFallbackError via onFallback (not onError)', async () => {
    const onFallback = vi.fn()
    const onError = vi.fn()
    const p = h.pipeline.speak('q', OPTS, { onFallback, onError })
    await flush()
    h.synth.reject(0, new TtsFallbackError('quota exhausted', 429))
    await p
    expect(onFallback).toHaveBeenCalledWith('quota exhausted')
    expect(onError).not.toHaveBeenCalled()
  })

  it('speaks via browser fallback after ElevenLabs 429', async () => {
    const fallbackSpeak = vi.fn(async () => {})
    const fallback: TtsFallbackSpeaker = {
      isAvailable: () => true,
      speak: fallbackSpeak,
      cancel: vi.fn(),
    }
    const { synth, pipeline } = setup(() => ['only chunk'], fallback)
    const onComplete = vi.fn()
    const onFallback = vi.fn()
    const p = pipeline.speak('Question text', OPTS, { onComplete, onFallback })
    await flush()
    synth.reject(0, new TtsFallbackError('rate limited', 429))
    await p
    expect(onFallback).toHaveBeenCalledWith('rate limited')
    expect(fallbackSpeak).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('speaks via browser fallback after ElevenLabs timeout', async () => {
    const fallbackSpeak = vi.fn(async () => {})
    const fallback: TtsFallbackSpeaker = {
      isAvailable: () => true,
      speak: fallbackSpeak,
      cancel: vi.fn(),
    }
    const { synth, pipeline } = setup(() => ['only chunk'], fallback)
    const p = pipeline.speak('Question text', OPTS)
    await flush()
    synth.reject(0, new TtsFallbackError('TTS timed out', 504))
    await p
    expect(fallbackSpeak).toHaveBeenCalledTimes(1)
  })

  it('speaks via browser fallback after network failure', async () => {
    const fallbackSpeak = vi.fn(async () => {})
    const fallback: TtsFallbackSpeaker = {
      isAvailable: () => true,
      speak: fallbackSpeak,
      cancel: vi.fn(),
    }
    const { synth, pipeline } = setup(() => ['only chunk'], fallback)
    const p = pipeline.speak('Question text', OPTS)
    await flush()
    synth.reject(0, new TtsFallbackError('network error'))
    await p
    expect(fallbackSpeak).toHaveBeenCalledTimes(1)
  })

  it('reports hard errors via onError', async () => {
    const onError = vi.fn()
    const p = h.pipeline.speak('q', OPTS, { onError })
    await flush()
    h.synth.reject(0, new Error('500 upstream'))
    await p
    expect(onError).toHaveBeenCalledWith('500 upstream')
  })

  it('plays multiple chunks sequentially and prefetches ahead', async () => {
    const multi = setup(() => ['chunk one.', 'chunk two.', 'chunk three.'])
    const onComplete = vi.fn()
    multi.pipeline.speak('long text', OPTS, { onComplete })
    await flush()
    // First + prefetch of second requested.
    expect(multi.synth.calls.map((c) => c.text)).toEqual(['chunk one.'])

    multi.synth.resolve(0)
    await flush()
    // chunk one playing, chunk two prefetched
    expect(multi.sink.played).toHaveLength(1)
    expect(multi.synth.calls.map((c) => c.text)).toEqual(['chunk one.', 'chunk two.'])

    multi.sink.completeLatest() // finish chunk one
    multi.synth.resolve(1)
    await flush()
    expect(multi.sink.played).toHaveLength(2)
    expect(multi.synth.calls.map((c) => c.text)).toEqual([
      'chunk one.',
      'chunk two.',
      'chunk three.',
    ])

    multi.sink.completeLatest()
    multi.synth.resolve(2)
    await flush()
    multi.sink.completeLatest()
    await flush()
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('ignores blank text', async () => {
    await h.pipeline.speak('   ', OPTS)
    expect(h.synth.calls).toHaveLength(0)
  })
})
