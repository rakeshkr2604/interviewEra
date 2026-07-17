import { describe, expect, it } from 'vitest'
import {
  createScriptSessionPrepController,
  PREP_CHECKLIST,
} from '@/lib/interview/script-session-prep'

describe('createScriptSessionPrepController', () => {
  it('tracks parallel prep tracks and notifies subscribers', () => {
    const prep = createScriptSessionPrepController()
    const seen: string[] = []
    const unsub = prep.subscribe((snap) => {
      seen.push(`${snap.profile}/${snap.turn}/${snap.mic}`)
    })

    prep.setTrack('profile', 'running')
    prep.setTrack('turn', 'running')
    prep.setTrack('mic', 'running')
    expect(prep.criticalReady()).toBe(false)

    prep.setTrack('profile', 'ready')
    prep.setTrack('turn', 'ready')
    prep.setMicDetail('granted')
    prep.setTrack('mic', 'ready')
    expect(prep.criticalReady()).toBe(true)

    unsub()
    prep.setTrack('mic', 'failed')
    // Last emit before unsub should include ready triad.
    expect(seen.at(-1)).toBe('ready/ready/ready')
    expect(PREP_CHECKLIST).toHaveLength(3)
  })

  it('reset clears tracks', () => {
    const prep = createScriptSessionPrepController()
    prep.setTrack('profile', 'ready')
    prep.setTrack('turn', 'ready')
    prep.reset()
    expect(prep.snapshot().profile).toBe('idle')
    expect(prep.criticalReady()).toBe(false)
  })
})

describe('probeMicrophoneReadiness', () => {
  it('marks unsupported when flagged', async () => {
    const { probeMicrophoneReadiness } = await import('@/lib/interview/script-session-prep')
    const result = await probeMicrophoneReadiness({ unsupported: true })
    expect(result).toEqual({ status: 'failed', detail: 'unsupported' })
  })

  it('skips getUserMedia when not allowed', async () => {
    const { probeMicrophoneReadiness } = await import('@/lib/interview/script-session-prep')
    const result = await probeMicrophoneReadiness({ allowGetUserMedia: false })
    expect(['skipped', 'ready', 'failed']).toContain(result.status)
    if (result.status === 'skipped') {
      expect(['prompt', 'unknown']).toContain(result.detail)
    }
  })
})
