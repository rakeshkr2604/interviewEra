/**
 * Pure quota accounting state machine for tests and documentation.
 * Maps client/server actions to vs:active counter deltas.
 */

export type QuotaAccountingAction =
  | 'session_start'
  | 'token_refresh'
  | 'session_release'
  | 'browser_close'
  | 'refresh_teardown'

export interface QuotaCounterState {
  active_sessions: number
  lease_active: boolean
}

/** Returns next active session count after an action. Never below 0. */
export function applyQuotaAction(
  state: QuotaCounterState,
  action: QuotaAccountingAction,
): QuotaCounterState {
  switch (action) {
    case 'session_start':
      return {
        active_sessions: state.active_sessions + 1,
        lease_active: true,
      }
    case 'token_refresh':
      return state
    case 'refresh_teardown':
      return state
    case 'session_release':
    case 'browser_close':
      return {
        active_sessions: Math.max(0, state.active_sessions - 1),
        lease_active: false,
      }
    default:
      return state
  }
}

export function shouldAcquireOnTokenRequest(refreshLeaseId?: string | null): boolean {
  return !refreshLeaseId
}

export function shouldReleaseOnStop(releaseQuota: boolean, leaseActive: boolean): boolean {
  return releaseQuota && leaseActive
}

export function shouldRetryTokenAfter429(fallback: string | null | undefined): boolean {
  return fallback !== 'text_mode'
}
