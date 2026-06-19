import { describe, expect, it } from 'vitest'
import {
  type VoiceSessionState,
  type VoiceSessionEvent,
  TRANSITIONS,
  nextState,
  canTransition,
  legalEvents,
  isTerminal,
  isListeningState,
  isSpeakingState,
} from '@/lib/voice/core/session-state'

const ALL_STATES: VoiceSessionState[] = [
  'idle',
  'initializing',
  'ready',
  'interviewer_speaking',
  'preparing_listening',
  'listening',
  'processing_answer',
  'generating_response',
  'completed',
  'error',
  'destroyed',
]

describe('session-state FSM', () => {
  it('drives a full happy-path interview turn loop', () => {
    let s: VoiceSessionState = 'idle'
    const path: VoiceSessionEvent[] = [
      'INITIALIZE',
      'READY',
      'SPEAK',
      'SPEECH_FINISHED',
      'LISTENING_STARTED',
      'ANSWER_SUBMITTED',
      'SCORED',
      'RESPONSE_READY', // next question → back to interviewer_speaking
    ]
    for (const ev of path) {
      const next = nextState(s, ev)
      expect(next, `transition ${s} --${ev}-->`).not.toBeNull()
      s = next as VoiceSessionState
    }
    expect(s).toBe('interviewer_speaking')
  })

  it('completes from generating_response', () => {
    expect(nextState('generating_response', 'INTERVIEW_DONE')).toBe('completed')
  })

  it('rejects illegal transitions', () => {
    expect(nextState('idle', 'SPEAK')).toBeNull()
    expect(nextState('listening', 'SPEAK')).toBeNull()
    expect(nextState('completed', 'ANSWER_SUBMITTED')).toBeNull()
    expect(canTransition('ready', 'ANSWER_SUBMITTED')).toBe(false)
  })

  it('allows DESTROY from every non-terminal state', () => {
    for (const s of ALL_STATES) {
      if (s === 'destroyed') {
        expect(nextState(s, 'DESTROY')).toBeNull()
      } else {
        expect(nextState(s, 'DESTROY'), `DESTROY from ${s}`).toBe('destroyed')
      }
    }
  })

  it('allows FAIL only from failable working states', () => {
    expect(nextState('initializing', 'FAIL')).toBe('error')
    expect(nextState('listening', 'FAIL')).toBe('error')
    expect(nextState('processing_answer', 'FAIL')).toBe('error')
    // Not failable
    expect(nextState('idle', 'FAIL')).toBeNull()
    expect(nextState('ready', 'FAIL')).toBeNull()
    expect(nextState('completed', 'FAIL')).toBeNull()
  })

  it('recovers from error to listening or speaking', () => {
    expect(nextState('error', 'RECOVER_LISTEN')).toBe('preparing_listening')
    expect(nextState('error', 'RECOVER_SPEAK')).toBe('interviewer_speaking')
  })

  it('treats destroyed as terminal', () => {
    expect(isTerminal('destroyed')).toBe(true)
    expect(legalEvents('destroyed')).toHaveLength(0)
    for (const ev of Object.keys(TRANSITIONS.destroyed)) {
      throw new Error(`destroyed should have no edges, found ${ev}`)
    }
  })

  it('classifies listening/speaking states', () => {
    expect(isListeningState('listening')).toBe(true)
    expect(isListeningState('preparing_listening')).toBe(false)
    expect(isSpeakingState('interviewer_speaking')).toBe(true)
    expect(isSpeakingState('listening')).toBe(false)
  })

  it('never maps an event to an undefined state', () => {
    for (const s of ALL_STATES) {
      for (const ev of legalEvents(s)) {
        expect(ALL_STATES).toContain(nextState(s, ev))
      }
    }
  })
})
