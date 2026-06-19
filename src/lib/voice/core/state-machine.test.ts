import { describe, expect, it, vi } from 'vitest'
import { VoiceSessionStateMachine } from '@/lib/voice/core/state-machine'
import { VoiceEventBus } from '@/lib/voice/core/event-bus'
import { createSessionId, createTurnContext, type TurnContext } from '@/lib/voice/core/ids'

function makeCtx(): TurnContext {
  return createTurnContext({
    interviewId: 'iv_1',
    sessionId: createSessionId(),
    questionIndex: 0,
  })
}

describe('VoiceSessionStateMachine', () => {
  it('starts idle and applies legal transitions', () => {
    const m = new VoiceSessionStateMachine()
    expect(m.getState()).toBe('idle')
    expect(m.send('INITIALIZE')).toBe(true)
    expect(m.getState()).toBe('initializing')
    expect(m.send('READY')).toBe(true)
    expect(m.getState()).toBe('ready')
  })

  it('rejects illegal transitions without changing state', () => {
    const m = new VoiceSessionStateMachine()
    expect(m.send('SPEAK')).toBe(false)
    expect(m.getState()).toBe('idle')
  })

  it('emits StateTransition on the bus with context', () => {
    const bus = new VoiceEventBus()
    const m = new VoiceSessionStateMachine({ bus })
    const ctx = makeCtx()
    const seen: Array<{ from: string; to: string }> = []
    bus.on('StateTransition', (e) => {
      seen.push({ from: e.payload.from, to: e.payload.to })
      expect(e.turnId).toBe(ctx.turnId)
    })
    m.send('INITIALIZE', ctx)
    m.send('READY', ctx)
    expect(seen).toEqual([
      { from: 'idle', to: 'initializing' },
      { from: 'initializing', to: 'ready' },
    ])
  })

  it('notifies onChange listeners', () => {
    const m = new VoiceSessionStateMachine()
    const listener = vi.fn()
    m.onChange(listener)
    m.send('INITIALIZE')
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'idle', to: 'initializing', event: 'INITIALIZE' }),
    )
  })

  it('records bounded history', () => {
    const m = new VoiceSessionStateMachine({ historyLimit: 2 })
    m.send('INITIALIZE')
    m.send('READY')
    m.send('SPEAK')
    const hist = m.getHistory()
    expect(hist).toHaveLength(2)
    expect(hist[hist.length - 1]).toMatchObject({ from: 'ready', to: 'interviewer_speaking' })
  })

  it('allows DESTROY from any non-terminal state and is then terminal', () => {
    const m = new VoiceSessionStateMachine()
    m.send('INITIALIZE')
    m.send('READY')
    m.send('SPEAK')
    expect(m.send('DESTROY')).toBe(true)
    expect(m.getState()).toBe('destroyed')
    expect(m.isTerminal()).toBe(true)
    // No further transitions possible.
    expect(m.send('SPEAK')).toBe(false)
    expect(m.send('DESTROY')).toBe(false)
  })

  it('isolates throwing onChange listeners', () => {
    const m = new VoiceSessionStateMachine()
    const good = vi.fn()
    m.onChange(() => {
      throw new Error('boom')
    })
    m.onChange(good)
    expect(m.send('INITIALIZE')).toBe(true)
    expect(good).toHaveBeenCalledTimes(1)
  })

  it('drives the full turn cycle including a follow-up loop', () => {
    const m = new VoiceSessionStateMachine()
    const ctx = makeCtx()
    const events = [
      'INITIALIZE',
      'READY',
      'SPEAK',
      'SPEECH_FINISHED',
      'LISTENING_STARTED',
      'ANSWER_SUBMITTED',
      'SCORED',
      'RESPONSE_READY', // follow-up → speaking again
      'SPEECH_FINISHED',
      'LISTENING_STARTED',
      'ANSWER_SUBMITTED',
      'SCORED',
      'INTERVIEW_DONE',
    ] as const
    for (const ev of events) expect(m.send(ev, ctx), ev).toBe(true)
    expect(m.getState()).toBe('completed')
  })
})
