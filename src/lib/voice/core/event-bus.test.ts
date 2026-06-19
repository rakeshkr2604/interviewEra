import { describe, expect, it, vi } from 'vitest'
import { VoiceEventBus } from '@/lib/voice/core/event-bus'
import { createSessionId, createTurnId, createCorrelationId } from '@/lib/voice/core/ids'

function ctx() {
  return {
    sessionId: createSessionId(),
    turnId: createTurnId(),
    correlationId: createCorrelationId(),
  }
}

describe('VoiceEventBus', () => {
  it('delivers typed events to subscribers with a correlated envelope', () => {
    const bus = new VoiceEventBus()
    const seen: number[] = []
    bus.on('TranscriptFinalized', (e) => {
      seen.push(e.payload.chars)
      expect(e.type).toBe('TranscriptFinalized')
      expect(e.sessionId).toBeTruthy()
      expect(e.timestamp).toBeTypeOf('number')
    })
    bus.emit('TranscriptFinalized', { text: 'hello world', chars: 11 }, { ctx: ctx() })
    expect(seen).toEqual([11])
  })

  it('only notifies listeners of the matching type', () => {
    const bus = new VoiceEventBus()
    const a = vi.fn()
    const b = vi.fn()
    bus.on('PlaybackStarted', a)
    bus.on('PlaybackCompleted', b)
    bus.emit('PlaybackStarted', { durationSec: 3 })
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).not.toHaveBeenCalled()
  })

  it('supports wildcard observers for logging', () => {
    const bus = new VoiceEventBus()
    const all = vi.fn()
    bus.onAny(all)
    bus.emit('ListeningStarted', { engine: 'deepgram' })
    bus.emit('SpeechDetected', {})
    expect(all).toHaveBeenCalledTimes(2)
  })

  it('unsubscribes correctly', () => {
    const bus = new VoiceEventBus()
    const fn = vi.fn()
    const off = bus.on('SpeechDetected', fn)
    bus.emit('SpeechDetected', {})
    off()
    bus.emit('SpeechDetected', {})
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('isolates a throwing listener and still notifies others', () => {
    const onListenerError = vi.fn()
    const bus = new VoiceEventBus({ onListenerError })
    const good = vi.fn()
    bus.on('SpeechDetected', () => {
      throw new Error('boom')
    })
    bus.on('SpeechDetected', good)
    bus.emit('SpeechDetected', {})
    expect(good).toHaveBeenCalledTimes(1)
    expect(onListenerError).toHaveBeenCalledTimes(1)
  })

  it('does not break when a listener unsubscribes during dispatch', () => {
    const bus = new VoiceEventBus()
    const order: string[] = []
    const off1 = bus.on('SpeechDetected', () => {
      order.push('first')
      off1()
    })
    bus.on('SpeechDetected', () => order.push('second'))
    bus.emit('SpeechDetected', {})
    expect(order).toEqual(['first', 'second'])
  })

  it('clear() removes every listener', () => {
    const bus = new VoiceEventBus()
    bus.on('SpeechDetected', vi.fn())
    bus.onAny(vi.fn())
    expect(bus.listenerCount()).toBe(2)
    bus.clear()
    expect(bus.listenerCount()).toBe(0)
  })
})
