import { describe, expect, it } from 'vitest';
import {
  evaluateRecoveryEmailEligibility,
  isRecoveryGlobalUnsubscribed,
  type RecoveryEmailInterviewRow,
} from './recovery-email-eligibility';
import {
  isStageInWindow,
  parseRecoveryCronDryRunParam,
  recoveryEmailIdempotencyKey,
  RECOVERY_EMAIL_MAX_AGE_MS,
  RECOVERY_EMAIL_R1_MIN_MS,
  RECOVERY_EMAIL_R2_MIN_MS,
  RECOVERY_EMAIL_STAGES,
} from './recovery-email-cadence';
import { defaultNotificationPreferences } from '@/lib/settings/notification-preferences';

const HOUR = 3600_000;
const DAY = 24 * HOUR;

const abandonedAt = Date.parse('2026-01-01T00:00:00.000Z');

const baseInterview = (completedAtIso?: string): RecoveryEmailInterviewRow => ({
  id: 'int-1',
  user_id: 'user-1',
  role: 'SDE Intern',
  engine: 'v2.1',
  status: 'abandoned',
  credit_deducted: true,
  abandoned_resume_used: false,
  completed_at:
    completedAtIso ??
    new Date(Date.now() - 25 * HOUR).toISOString(),
});

const prefsOn = defaultNotificationPreferences;

function expectStages(
  ageMs: number,
  expected: { r1: boolean; r2: boolean },
): void {
  const nowMs = abandonedAt + ageMs;
  expect(isStageInWindow(abandonedAt, nowMs, 'r1')).toBe(expected.r1);
  expect(isStageInWindow(abandonedAt, nowMs, 'r2')).toBe(expected.r2);
}

describe('recovery-email-cadence — mutually exclusive windows', () => {
  it('builds stable idempotency keys', () => {
    expect(recoveryEmailIdempotencyKey('abc', 'r1')).toBe(
      'interview_recovery:abc:r1',
    );
    expect(recoveryEmailIdempotencyKey('abc', 'r2')).toBe(
      'interview_recovery:abc:r2',
    );
  });

  it('boundary matrix with fixed timestamps', () => {
    expectStages(RECOVERY_EMAIL_R1_MIN_MS - 1, { r1: false, r2: false });
    expectStages(RECOVERY_EMAIL_R1_MIN_MS, { r1: true, r2: false });
    expectStages(RECOVERY_EMAIL_R2_MIN_MS - 1, { r1: true, r2: false });
    expectStages(RECOVERY_EMAIL_R2_MIN_MS, { r1: false, r2: true });
    expectStages(RECOVERY_EMAIL_R2_MIN_MS + 1, { r1: false, r2: true });
    expectStages(RECOVERY_EMAIL_MAX_AGE_MS - 1, { r1: false, r2: true });
    expectStages(RECOVERY_EMAIL_MAX_AGE_MS, { r1: false, r2: true });
    expectStages(RECOVERY_EMAIL_MAX_AGE_MS + 1, { r1: false, r2: false });
    expectStages(8 * DAY, { r1: false, r2: false });
  });

  it('late first cron at/after 72h never selects r1 (no same-day dual send)', () => {
    const lateAges = [
      RECOVERY_EMAIL_R2_MIN_MS,
      RECOVERY_EMAIL_R2_MIN_MS + 6 * HOUR,
      4 * DAY,
      RECOVERY_EMAIL_MAX_AGE_MS,
    ];
    for (const age of lateAges) {
      const nowMs = abandonedAt + age;
      expect(isStageInWindow(abandonedAt, nowMs, 'r1')).toBe(false);
      expect(isStageInWindow(abandonedAt, nowMs, 'r2')).toBe(
        age <= RECOVERY_EMAIL_MAX_AGE_MS,
      );
    }
  });

  it('exposes two stages and dry-run fail-closed parsing', () => {
    expect(RECOVERY_EMAIL_STAGES).toHaveLength(2);
    expect(parseRecoveryCronDryRunParam(null)).toBe(false);
    expect(parseRecoveryCronDryRunParam('1')).toBe(true);
    expect(parseRecoveryCronDryRunParam('0')).toBe(true);
  });
});

describe('isRecoveryGlobalUnsubscribed', () => {
  it('ORs digest flag and email_preferences.unsubscribed_all', () => {
    expect(
      isRecoveryGlobalUnsubscribed({
        emailDigestUnsubscribed: false,
        emailPreferencesUnsubscribedAll: false,
      }),
    ).toBe(false);
    expect(
      isRecoveryGlobalUnsubscribed({
        emailDigestUnsubscribed: true,
        emailPreferencesUnsubscribedAll: false,
      }),
    ).toBe(true);
    expect(
      isRecoveryGlobalUnsubscribed({
        emailDigestUnsubscribed: false,
        emailPreferencesUnsubscribedAll: true,
      }),
    ).toBe(true);
    expect(
      isRecoveryGlobalUnsubscribed({
        emailDigestUnsubscribed: null,
        emailPreferencesUnsubscribedAll: undefined,
      }),
    ).toBe(false);
  });
});

describe('evaluateRecoveryEmailEligibility', () => {
  it('accepts eligible abandoned v2.1 with prefs, not globally unsubbed', () => {
    const result = evaluateRecoveryEmailEligibility({
      interview: baseInterview(),
      stage: 'r1',
      notificationPreferences: prefsOn,
      globalUnsubscribed: false,
      hasEmail: true,
      emailVerified: true,
      alreadyHandled: false,
      featureEnabled: true,
    });
    expect(result.ok).toBe(true);
  });

  it('suppresses when globally unsubscribed even if interviewReminders true', () => {
    expect(
      evaluateRecoveryEmailEligibility({
        interview: baseInterview(),
        stage: 'r1',
        notificationPreferences: prefsOn,
        globalUnsubscribed: true,
        hasEmail: true,
        emailVerified: true,
        featureEnabled: true,
      }),
    ).toMatchObject({ ok: false, reason: 'globally_unsubscribed' });
  });

  it('fails closed when globalUnsubscribed is unknown', () => {
    expect(
      evaluateRecoveryEmailEligibility({
        interview: baseInterview(),
        stage: 'r1',
        notificationPreferences: prefsOn,
        globalUnsubscribed: undefined,
        hasEmail: true,
        emailVerified: true,
        featureEnabled: true,
      }),
    ).toMatchObject({ ok: false, reason: 'globally_unsubscribed' });

    expect(
      evaluateRecoveryEmailEligibility({
        interview: baseInterview(),
        stage: 'r1',
        notificationPreferences: prefsOn,
        globalUnsubscribed: null,
        hasEmail: true,
        emailVerified: true,
        featureEnabled: true,
      }),
    ).toMatchObject({ ok: false, reason: 'globally_unsubscribed' });
  });

  it('fails closed when preferences omitted; suppresses reminders off', () => {
    expect(
      evaluateRecoveryEmailEligibility({
        interview: baseInterview(),
        stage: 'r1',
        notificationPreferences: null,
        globalUnsubscribed: false,
        hasEmail: true,
        emailVerified: true,
        featureEnabled: true,
      }),
    ).toMatchObject({ ok: false, reason: 'reminders_opted_out' });

    expect(
      evaluateRecoveryEmailEligibility({
        interview: baseInterview(),
        stage: 'r1',
        globalUnsubscribed: false,
        hasEmail: true,
        emailVerified: true,
        notificationPreferences: {
          ...prefsOn,
          interviewReminders: false,
        },
        featureEnabled: true,
      }),
    ).toMatchObject({ ok: false, reason: 'reminders_opted_out' });
  });

  it('suppresses completed / ineligible / wrong stage windows', () => {
    expect(
      evaluateRecoveryEmailEligibility({
        interview: { ...baseInterview(), status: 'completed' },
        stage: 'r1',
        notificationPreferences: prefsOn,
        globalUnsubscribed: false,
        hasEmail: true,
        emailVerified: true,
        featureEnabled: true,
      }).ok,
    ).toBe(false);

    const at72h = new Date(abandonedAt).toISOString();
    const nowAt72h = abandonedAt + RECOVERY_EMAIL_R2_MIN_MS;
    expect(
      evaluateRecoveryEmailEligibility({
        interview: baseInterview(at72h),
        stage: 'r1',
        nowMs: nowAt72h,
        notificationPreferences: prefsOn,
        globalUnsubscribed: false,
        hasEmail: true,
        emailVerified: true,
        featureEnabled: true,
      }),
    ).toMatchObject({ ok: false, reason: 'stage_not_due' });

    expect(
      evaluateRecoveryEmailEligibility({
        interview: baseInterview(at72h),
        stage: 'r2',
        nowMs: nowAt72h,
        notificationPreferences: prefsOn,
        globalUnsubscribed: false,
        hasEmail: true,
        emailVerified: true,
        featureEnabled: true,
      }).ok,
    ).toBe(true);
  });

  it('idempotency already-handled suppresses', () => {
    expect(
      evaluateRecoveryEmailEligibility({
        interview: baseInterview(),
        stage: 'r1',
        notificationPreferences: prefsOn,
        globalUnsubscribed: false,
        hasEmail: true,
        emailVerified: true,
        alreadyHandled: true,
        featureEnabled: true,
      }),
    ).toMatchObject({ ok: false, reason: 'already_sent_or_claimed' });
  });
});
