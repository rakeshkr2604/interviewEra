import { describe, expect, it } from 'vitest'
import {
  __resetMicPipelineMetricsForTests,
  getMicPipelineMetrics,
  recordMicAcquireSuccess,
  recordMicRecovery,
} from '@/lib/voice/mic-pipeline-telemetry'

describe('mic-pipeline-telemetry metrics', () => {
  it('computes success and recovery rates', () => {
    __resetMicPipelineMetricsForTests()
    recordMicAcquireSuccess(120)
    recordMicAcquireSuccess(80)
    recordMicRecovery(true, 500)
    recordMicRecovery(false, 900)

    const m = getMicPipelineMetrics()
    expect(m.micSuccessCount).toBe(2)
    expect(m.avgCaptureTimeMs).toBe(100)
    expect(m.recoverySuccessPct).toBe(0.5)
    expect(m.p95AcquisitionTimeMs).toBeGreaterThan(0)
  })
})
