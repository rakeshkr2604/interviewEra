import { describe, expect, it, vi } from 'vitest'
import { StreamingSTT } from '@/lib/voice/stt-client'
import { PcmSendBuffer } from '@/lib/voice/stt/pcm-send-buffer'

describe('StreamingSTT.sendAudio', () => {
  it('sends PCM when websocket is open', () => {
    const stt = new StreamingSTT('test-key')
    const sendMedia = vi.fn()
    ;(stt as unknown as { socket: { readyState: number; sendMedia: typeof sendMedia } }).socket = {
      readyState: 1,
      sendMedia,
    }

    const buf = new ArrayBuffer(8)
    stt.sendAudio(buf)
    stt.sendAudio(buf)

    expect(sendMedia).toHaveBeenCalledTimes(2)
    expect(sendMedia).toHaveBeenCalledWith(buf)
  })

  it('queues PCM while websocket is connecting', () => {
    const stt = new StreamingSTT('test-key')
    const sendMedia = vi.fn()
    ;(stt as unknown as { socket: { readyState: number; sendMedia: typeof sendMedia } }).socket = {
      readyState: 0,
      sendMedia,
    }

    const buf = new ArrayBuffer(8)
    stt.sendAudio(buf)

    expect(sendMedia).not.toHaveBeenCalled()
    const buffer = (stt as unknown as { pcmBuffer: PcmSendBuffer }).pcmBuffer
    expect(buffer.queuedChunks).toBe(1)
  })

  it('flushes queued PCM when socket opens', () => {
    const stt = new StreamingSTT('test-key')
    const sendMedia = vi.fn()
    const socket = { readyState: 0, sendMedia }
    ;(stt as unknown as { socket: typeof socket }).socket = socket

    const buf = new ArrayBuffer(8)
    stt.sendAudio(buf)
    socket.readyState = 1

    const flushed = (stt as unknown as { pcmBuffer: PcmSendBuffer }).pcmBuffer.flush(
      (chunk) => stt.sendAudio(chunk),
    )
    expect(flushed).toBe(1)
    expect(sendMedia).toHaveBeenCalledWith(buf)
  })
})
