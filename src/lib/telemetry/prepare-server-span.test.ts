import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  logPrepareCompleted,
  logPrepareFailed,
  logPrepareStarted,
} from '@/lib/telemetry/prepare-server-span'

describe('prepare-server-span', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs prepare_started and returns start timestamp', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const startedAt = logPrepareStarted('int-123')
    expect(startedAt).toBeGreaterThan(0)
    expect(info).toHaveBeenCalledWith(
      '[prepare] prepare_started',
      expect.stringContaining('"interview_id":"int-123"'),
    )
  })

  it('logs prepare_completed with duration_ms', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    logPrepareCompleted('int-123', Date.now() - 4500, 6)
    expect(info).toHaveBeenCalledWith(
      '[prepare] prepare_completed',
      expect.stringMatching(/duration_ms":\d+/),
    )
  })

  it('logs prepare_failed with error', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    logPrepareFailed('int-123', Date.now() - 1000, 'OpenAI timeout', 500)
    expect(warn).toHaveBeenCalledWith(
      '[prepare] prepare_failed',
      expect.stringContaining('"error":"OpenAI timeout"'),
    )
  })
})
