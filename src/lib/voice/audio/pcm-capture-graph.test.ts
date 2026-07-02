import { describe, expect, it, vi } from 'vitest'
import { float32ToInt16Pcm } from '@/lib/voice/audio/pcm-capture-graph'
import { PcmSendBuffer } from '@/lib/voice/stt/pcm-send-buffer'

describe('float32ToInt16Pcm', () => {
  it('converts samples to little-endian int16', () => {
    const input = new Float32Array([0, 1, -1, 0.5])
    const buf = float32ToInt16Pcm(input)
    const view = new Int16Array(buf)
    expect(view[0]).toBe(0)
    expect(view[1]).toBe(0x7fff)
    expect(view[2]).toBe(-0x8000)
    expect(view[3]).toBe(0x3fff)
  })
})

describe('PcmSendBuffer', () => {
  it('flushes frames in FIFO order', () => {
    const buffer = new PcmSendBuffer(32_000)
    const a = new ArrayBuffer(4)
    const b = new ArrayBuffer(8)
    buffer.enqueue(a)
    buffer.enqueue(b)

    const sent: ArrayBuffer[] = []
    const count = buffer.flush((chunk) => sent.push(chunk))

    expect(count).toBe(2)
    expect(sent).toEqual([a, b])
    expect(buffer.queuedChunks).toBe(0)
  })

  it('drops oldest frames when over capacity', () => {
    const buffer = new PcmSendBuffer(10)
    buffer.enqueue(new ArrayBuffer(6))
    buffer.enqueue(new ArrayBuffer(6))

    expect(buffer.queuedBytes).toBeLessThanOrEqual(10)
    expect(buffer.queuedChunks).toBe(1)
  })

  it('clear resets state', () => {
    const buffer = new PcmSendBuffer()
    buffer.enqueue(new ArrayBuffer(8))
    buffer.clear()
    expect(buffer.queuedChunks).toBe(0)
    expect(buffer.flush(() => {})).toBe(0)
  })
})

describe('supportsAudioWorkletCapture', () => {
  it('detects audioWorklet availability', async () => {
    const { supportsAudioWorkletCapture } = await import('@/lib/voice/audio/pcm-capture-graph')
    const ctx = { audioWorklet: { addModule: vi.fn() } } as unknown as AudioContext
    expect(supportsAudioWorkletCapture(ctx)).toBe(true)
    expect(supportsAudioWorkletCapture({} as AudioContext)).toBe(false)
  })
})
