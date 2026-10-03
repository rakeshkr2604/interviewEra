/**
 * Shared eligibility for unfinished-interview recovery emails.
 * Reuses Phase 1 resume eligibility; adds recipient + preference gates.
 *
 * notificationPreferences is required — omitting it fails closed (opt-out).
 * globalUnsubscribed (users.email_digest_unsubscribed and/or
 * email_preferences.unsubscribed_all) suppresses regardless of interviewReminders.
 */

import { isAbandonedContinueEligible } from '@/lib/interview/interview-status';
import {
  parseNotificationPreferencesJson,
  type NotificationPreferences,
} from '@/lib/settings/notification-preferences';
import {
  isStageInWindow,
  type RecoveryEmailStage,
} from '@/lib/interview/recovery-email-cadence';

export type RecoveryEmailInterviewRow = {
  id: string;
  user_id: string;
  role: string | null;
  engine: string | null;
  status: string;
  credit_deducted: boolean | null;
  abandoned_resume_used: boolean | null;
  completed_at: string | null;
};

export type RecoveryEmailSuppressionReason =
  | 'flag_disabled'
  | 'wrong_engine'
  | 'not_abandoned_eligible'
  | 'missing_abandon_timestamp'
  | 'stage_not_due'
  | 'missing_email'
  | 'unverified_email'
  | 'reminders_opted_out'
  | 'globally_unsubscribed'
  | 'already_sent_or_claimed';

export type RecoveryEmailEligibilityResult =
  | {
      ok: true;
      abandonedAtMs: number;
      role: string;
    }
  | {
      ok: false;
      reason: RecoveryEmailSuppressionReason;
    };

export function evaluateRecoveryEmailEligibility(input: {
  interview: RecoveryEmailInterviewRow;
  stage: RecoveryEmailStage;
  /** Required. Null/undefined fails closed as opted out. */
  notificationPreferences: NotificationPreferences | null | undefined;
  /**
   * Global unsubscribe from users.email_digest_unsubscribed and/or
   * email_preferences.unsubscribed_all. True → suppress.
   * Undefined treated as unknown → fail closed (suppress).
   */
  globalUnsubscribed: boolean | null | undefined;
  nowMs?: number;
  hasEmail?: boolean;
  emailVerified?: boolean;
  alreadyHandled?: boolean;
  featureEnabled?: boolean;
}): RecoveryEmailEligibilityResult {
  if (input.featureEnabled === false) {
    return { ok: false, reason: 'flag_disabled' };
  }

  if (input.interview.engine !== 'v2.1') {
    return { ok: false, reason: 'wrong_engine' };
  }

  if (
    !isAbandonedContinueEligible({
      status: input.interview.status,
      creditDeducted: input.interview.credit_deducted,
      abandonedResumeUsed: input.interview.abandoned_resume_used,
    })
  ) {
    return { ok: false, reason: 'not_abandoned_eligible' };
  }

  const abandonedAtMs = Date.parse(input.interview.completed_at ?? '');
  if (!Number.isFinite(abandonedAtMs)) {
    return { ok: false, reason: 'missing_abandon_timestamp' };
  }

  const nowMs = input.nowMs ?? Date.now();
  if (!isStageInWindow(abandonedAtMs, nowMs, input.stage)) {
    return { ok: false, reason: 'stage_not_due' };
  }

  if (input.hasEmail === false) {
    return { ok: false, reason: 'missing_email' };
  }

  if (input.emailVerified === false) {
    return { ok: false, reason: 'unverified_email' };
  }

  // Fail closed when global unsubscribe state was not loaded (null/undefined).
  if (input.globalUnsubscribed !== false) {
    return { ok: false, reason: 'globally_unsubscribed' };
  }

  // Fail closed: missing preferences must not bypass the opt-out gate.
  if (
    !input.notificationPreferences ||
    input.notificationPreferences.interviewReminders !== true
  ) {
    return { ok: false, reason: 'reminders_opted_out' };
  }

  if (input.alreadyHandled === true) {
    return { ok: false, reason: 'already_sent_or_claimed' };
  }

  return {
    ok: true,
    abandonedAtMs,
    role:
      (typeof input.interview.role === 'string' && input.interview.role.trim()) ||
      'mock interview',
  };
}

/**
 * Canonical global-unsubscribe OR across Settings digest flag and legacy
 * email_preferences.unsubscribed_all. Missing legacy row does not imply opted out.
 */
export function isRecoveryGlobalUnsubscribed(input: {
  emailDigestUnsubscribed: boolean | null | undefined;
  emailPreferencesUnsubscribedAll?: boolean | null | undefined;
}): boolean {
  if (input.emailDigestUnsubscribed === true) return true;
  if (input.emailPreferencesUnsubscribedAll === true) return true;
  return false;
}

export function prefsAllowInterviewReminders(raw: unknown): boolean {
  return parseNotificationPreferencesJson(raw).interviewReminders === true;
}
