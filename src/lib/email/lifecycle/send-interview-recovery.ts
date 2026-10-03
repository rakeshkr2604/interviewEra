import { createServiceClient } from '@/lib/supabase/server';
import { getEmailAppUrl } from '@/lib/server/get-base-url';
import { hasVerifiedEmail } from '@/lib/auth/verified-email-policy';
import { sendLifecycleTemplate } from '@/lib/email/lifecycle/send-template';
import { wasLifecycleEmailSent } from '@/lib/email/lifecycle/log';
import { parseNotificationPreferencesJson } from '@/lib/settings/notification-preferences';
import {
  isInterviewRecoveryEmailEnabled,
  recoveryEmailIdempotencyKey,
  type RecoveryEmailStage,
} from '@/lib/interview/recovery-email-cadence';
import {
  evaluateRecoveryEmailEligibility,
  isRecoveryGlobalUnsubscribed,
  type RecoveryEmailInterviewRow,
} from '@/lib/interview/recovery-email-eligibility';

const LOG_PREFIX = '[interview-recovery-email]';

export type SendInterviewRecoveryEmailResult = {
  sent: boolean;
  skipped: boolean;
  reason?: string;
  error?: string;
  providerMessageId?: string;
};

type Snapshot = {
  row: RecoveryEmailInterviewRow;
  prefs: ReturnType<typeof parseNotificationPreferencesJson>;
  /** false = may send; true = suppress; undefined = unknown (fail closed). */
  globalUnsubscribed: boolean | undefined;
  email: string | null;
  emailVerified: boolean;
  name: string;
};

async function loadRecoverySnapshot(
  supabase: ReturnType<typeof createServiceClient>,
  interviewId: string,
): Promise<
  | { ok: true; snapshot: Snapshot }
  | { ok: false; error: string }
> {
  const { data: interview, error: interviewError } = await supabase
    .from('interviews')
    .select(
      'id, user_id, role, engine, status, credit_deducted, abandoned_resume_used, completed_at',
    )
    .eq('id', interviewId)
    .maybeSingle();

  if (interviewError || !interview) {
    return {
      ok: false,
      error: interviewError?.message ?? 'interview_not_found',
    };
  }

  const row = interview as RecoveryEmailInterviewRow;

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('name, email, notification_preferences, email_digest_unsubscribed')
    .eq('id', row.user_id)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  const prefs = parseNotificationPreferencesJson(
    profile?.notification_preferences,
  );

  // Legacy PreferenceManager table — OR with Settings digest unsubscribe.
  const { data: emailPrefs } = await supabase
    .from('email_preferences')
    .select('unsubscribed_all')
    .eq('user_id', row.user_id)
    .maybeSingle();

  const globalUnsubscribed =
    profile == null
      ? undefined
      : isRecoveryGlobalUnsubscribed({
          emailDigestUnsubscribed: profile.email_digest_unsubscribed === true,
          emailPreferencesUnsubscribedAll:
            emailPrefs?.unsubscribed_all === true,
        });

  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(
    row.user_id,
  );
  if (authError || !authUser?.user) {
    return {
      ok: false,
      error: authError?.message ?? 'user_lookup_failed',
    };
  }

  const email =
    (typeof authUser.user.email === 'string' && authUser.user.email.trim()) ||
    (typeof profile?.email === 'string' && profile.email.trim()) ||
    null;

  const name =
    (typeof profile?.name === 'string' && profile.name.trim()) ||
    (typeof authUser.user.user_metadata?.name === 'string' &&
      authUser.user.user_metadata.name.trim()) ||
    'there';

  return {
    ok: true,
    snapshot: {
      row,
      prefs,
      globalUnsubscribed,
      email,
      emailVerified: hasVerifiedEmail(authUser.user),
      name,
    },
  };
}

/**
 * Revalidates eligibility twice (load → evaluate → reload → evaluate) before
 * claim/send. Shrinks the race window; claim→provider is still not atomic with
 * interview state. Does not mutate interview or credit state.
 */
export async function sendInterviewRecoveryEmailIfEligible(input: {
  interviewId: string;
  stage: RecoveryEmailStage;
  nowMs?: number;
}): Promise<SendInterviewRecoveryEmailResult> {
  if (!isInterviewRecoveryEmailEnabled()) {
    return { sent: false, skipped: true, reason: 'flag_disabled' };
  }

  const supabase = createServiceClient();

  const first = await loadRecoverySnapshot(supabase, input.interviewId);
  if (!first.ok) {
    return { sent: false, skipped: false, error: first.error };
  }

  const idempotencyKey = recoveryEmailIdempotencyKey(
    first.snapshot.row.id,
    input.stage,
  );
  const alreadyHandled = await wasLifecycleEmailSent(idempotencyKey);

  const firstEligibility = evaluateRecoveryEmailEligibility({
    interview: first.snapshot.row,
    stage: input.stage,
    nowMs: input.nowMs,
    notificationPreferences: first.snapshot.prefs,
    globalUnsubscribed: first.snapshot.globalUnsubscribed,
    hasEmail: Boolean(first.snapshot.email),
    emailVerified: first.snapshot.emailVerified,
    alreadyHandled,
    featureEnabled: true,
  });

  if (!firstEligibility.ok) {
    console.info(`${LOG_PREFIX} suppressed`, {
      interviewId: first.snapshot.row.id,
      stage: input.stage,
      reason: firstEligibility.reason,
      pass: 'initial',
    });
    return { sent: false, skipped: true, reason: firstEligibility.reason };
  }

  // Immediate revalidation — catch resume / opt-out / global unsub between first read and claim.
  const second = await loadRecoverySnapshot(supabase, input.interviewId);
  if (!second.ok) {
    return { sent: false, skipped: false, error: second.error };
  }

  const stillHandled = await wasLifecycleEmailSent(idempotencyKey);
  const secondEligibility = evaluateRecoveryEmailEligibility({
    interview: second.snapshot.row,
    stage: input.stage,
    nowMs: input.nowMs,
    notificationPreferences: second.snapshot.prefs,
    globalUnsubscribed: second.snapshot.globalUnsubscribed,
    hasEmail: Boolean(second.snapshot.email),
    emailVerified: second.snapshot.emailVerified,
    alreadyHandled: stillHandled,
    featureEnabled: true,
  });

  if (!secondEligibility.ok) {
    console.info(`${LOG_PREFIX} suppressed`, {
      interviewId: second.snapshot.row.id,
      stage: input.stage,
      reason: secondEligibility.reason,
      pass: 'revalidate',
    });
    return { sent: false, skipped: true, reason: secondEligibility.reason };
  }

  const { snapshot } = second;
  const baseUrl = getEmailAppUrl();
  const resumeUrl = `${baseUrl}/dashboard`;
  const settingsUrl = `${baseUrl}/settings`;
  const roleLabel = secondEligibility.role;

  return sendLifecycleTemplate({
    template: 'interview_recovery',
    to: snapshot.email!,
    userId: snapshot.row.user_id,
    idempotencyKey,
    props: {
      name: snapshot.name,
      roleLabel,
      resumeUrl,
      settingsUrl,
    },
    text: `Finish your unfinished interview (${roleLabel}). Resume: ${resumeUrl}. Manage reminders: ${settingsUrl}`,
  }).then((result) => ({
    sent: result.sent,
    skipped: result.skipped,
    reason: result.skipped ? 'already_sent_or_claimed' : undefined,
    error: result.error,
    providerMessageId: result.providerMessageId,
  }));
}
