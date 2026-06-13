import { describe, expect, it } from 'vitest';
import {
  applyQuotaAction,
  shouldAcquireOnTokenRequest,
  shouldReleaseOnStop,
  shouldRetryTokenAfter429,
  type QuotaCounterState,
} from '@/lib/quota/stt-session-accounting';

describe('stt-session-accounting state machine', () => {
  const idle: QuotaCounterState = { active_sessions: 0, lease_active: false };

  it('increments on session_start', () => {
    const next = applyQuotaAction(idle, 'session_start');
    expect(next.active_sessions).toBe(1);
    expect(next.lease_active).toBe(true);
  });

  it('does not increment on token_refresh', () => {
    const active = applyQuotaAction(idle, 'session_start');
    const refreshed = applyQuotaAction(active, 'token_refresh');
    expect(refreshed.active_sessions).toBe(1);
    expect(refreshed.lease_active).toBe(true);
  });

  it('does not decrement on refresh_teardown', () => {
    const active = applyQuotaAction(idle, 'session_start');
    const torn = applyQuotaAction(active, 'refresh_teardown');
    expect(torn.active_sessions).toBe(1);
  });

  it('decrements on session_release', () => {
    const active = applyQuotaAction(idle, 'session_start');
    const released = applyQuotaAction(active, 'session_release');
    expect(released.active_sessions).toBe(0);
    expect(released.lease_active).toBe(false);
  });

  it('decrements on browser_close', () => {
    const active = applyQuotaAction(idle, 'session_start');
    const closed = applyQuotaAction(active, 'browser_close');
    expect(closed.active_sessions).toBe(0);
  });

  it('never goes below zero on double release', () => {
    const once = applyQuotaAction(idle, 'session_release');
    const twice = applyQuotaAction(once, 'session_release');
    expect(twice.active_sessions).toBe(0);
  });

  it('full lifecycle: start → refresh → release', () => {
    let state = idle;
    state = applyQuotaAction(state, 'session_start');
    state = applyQuotaAction(state, 'token_refresh');
    state = applyQuotaAction(state, 'token_refresh');
    state = applyQuotaAction(state, 'session_release');
    expect(state.active_sessions).toBe(0);
  });

  it('browser refresh after start releases once', () => {
    let state = applyQuotaAction(idle, 'session_start');
    state = applyQuotaAction(state, 'browser_close');
    expect(state.active_sessions).toBe(0);
    state = applyQuotaAction(state, 'session_start');
    expect(state.active_sessions).toBe(1);
  });
});

describe('shouldAcquireOnTokenRequest', () => {
  it('acquires on fresh start', () => {
    expect(shouldAcquireOnTokenRequest()).toBe(true);
    expect(shouldAcquireOnTokenRequest(null)).toBe(true);
    expect(shouldAcquireOnTokenRequest('')).toBe(true);
  });

  it('skips acquire on refresh lease', () => {
    expect(shouldAcquireOnTokenRequest('lease-abc')).toBe(false);
  });
});

describe('shouldReleaseOnStop', () => {
  it('releases when lease active and releaseQuota true', () => {
    expect(shouldReleaseOnStop(true, true)).toBe(true);
  });

  it('skips release on refresh teardown', () => {
    expect(shouldReleaseOnStop(false, true)).toBe(false);
  });

  it('skips release when no lease', () => {
    expect(shouldReleaseOnStop(true, false)).toBe(false);
  });
});

describe('shouldRetryTokenAfter429', () => {
  it('retries transient 429', () => {
    expect(shouldRetryTokenAfter429(undefined)).toBe(true);
    expect(shouldRetryTokenAfter429(null)).toBe(true);
  });

  it('does not retry monthly quota fallback', () => {
    expect(shouldRetryTokenAfter429('text_mode')).toBe(false);
  });
});
