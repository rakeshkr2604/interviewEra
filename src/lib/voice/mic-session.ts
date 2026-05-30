/** Explicit mic lifecycle for candidate_answering (watchdog + UI). */
export type MicSessionState =
  | 'idle'
  | 'starting'
  | 'active'
  | 'recovering'
  | 'failed'
  | 'permission_denied'

export const MIC_RESTART_COOLDOWN_MS = 5_000
export const MIC_MAX_RESTARTS_PER_QUESTION = 3
export const MIC_WATCHDOG_POLL_MS = 2_000

export interface MicSessionSnapshot {
  micState: MicSessionState
  restartCount: number
  lastRestartAt: number | null
  watchdogActive: boolean
  permissionState: string
  recognitionState: string
}
