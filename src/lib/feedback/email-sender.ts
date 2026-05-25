/**
 * Resilient email sender for feedback notifications.
 *
 * Responsibilities:
 *  • Provider abstraction — try Resend; future providers (SendGrid, SMTP) slot
 *    in by implementing EmailProvider and appending to getProviders().
 *  • DB status tracking — atomically claims a row, then updates it to
 *    'sent' or 'failed' with a full error trail.
 *  • Backoff helpers — shared by this module and the retry cron.
 *
 * Never throws. Callers receive a boolean result.
 */

import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildSubject,
  buildFeedbackEmailHtml,
  buildFeedbackEmailText,
  type FeedbackPayload,
} from '@/lib/email/feedback-notification';

// ─── Constants ────────────────────────────────────────────────────────────────

const FROM_EMAIL = 'InterviewEra <transactional@interviewera.com>';

/** After this many failed attempts the row is permanently abandoned. */
export const MAX_EMAIL_ATTEMPTS = 5;

function founderEmail(): string {
  return process.env.FOUNDER_FEEDBACK_EMAIL?.trim() || 'Rakesh.kr2604@gmail.com';
}

// ─── Provider interface ───────────────────────────────────────────────────────

export interface EmailSendResult {
  ok: boolean;
  /** Human-readable error, present only when ok = false. */
  error?: string;
}

export interface EmailProvider {
  /** Short, stable identifier shown in logs (e.g. "resend", "sendgrid"). */
  readonly name: string;
  send(payload: FeedbackPayload): Promise<EmailSendResult>;
}

// ─── Resend provider ──────────────────────────────────────────────────────────

class ResendProvider implements EmailProvider {
  readonly name = 'resend';

  async send(payload: FeedbackPayload): Promise<EmailSendResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      return { ok: false, error: 'RESEND_API_KEY not configured' };
    }
    try {
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: founderEmail(),
        replyTo: payload.email,
        subject: buildSubject(payload),
        html: buildFeedbackEmailHtml(payload),
        text: buildFeedbackEmailText(payload),
      });
      if (error) {
        const msg = [error.name, error.message].filter(Boolean).join(': ') || JSON.stringify(error);
        return { ok: false, error: `Resend: ${msg}` };
      }
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: `Resend threw: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}

// ─── Provider registry ────────────────────────────────────────────────────────

/**
 * Ordered list of providers tried in sequence on each send attempt.
 * To add a fallback: prepend or append a new provider class here.
 * Example (future):
 *   return [new ResendProvider(), new SendGridProvider(), new SmtpProvider()];
 */
function getProviders(): EmailProvider[] {
  return [new ResendProvider()];
}

// ─── DB status helpers ────────────────────────────────────────────────────────

/**
 * Atomically claims a feedback row by transitioning it from
 * 'pending' or 'failed' → 'retrying'.
 *
 * Uses an optimistic-lock pattern: the WHERE clause only matches if the row
 * is still in a claimable state, preventing double-processing when two cron
 * invocations overlap.
 *
 * Returns true if this caller successfully claimed the row.
 */
export async function claimEmailRow(
  service: SupabaseClient,
  feedbackId: string,
): Promise<boolean> {
  const { data } = await service
    .from('feedbacks')
    .update({
      email_status: 'retrying',
      last_email_attempt_at: new Date().toISOString(),
    })
    .eq('id', feedbackId)
    .in('email_status', ['pending', 'failed'])
    .select('id')
    .maybeSingle();

  return data !== null;
}

async function markEmailSent(
  service: SupabaseClient,
  feedbackId: string,
): Promise<void> {
  const { error } = await service
    .from('feedbacks')
    .update({ email_status: 'sent' })
    .eq('id', feedbackId);
  if (error) {
    console.error('[email-sender] markEmailSent DB error:', error.message);
  }
}

async function markEmailFailed(
  service: SupabaseClient,
  feedbackId: string,
  currentAttempts: number,
  errorMessage: string,
): Promise<void> {
  const { error } = await service
    .from('feedbacks')
    .update({
      email_status: 'failed',
      email_attempts: currentAttempts + 1,
      last_email_error: errorMessage.slice(0, 1000),
      last_email_attempt_at: new Date().toISOString(),
    })
    .eq('id', feedbackId);
  if (error) {
    console.error('[email-sender] markEmailFailed DB error:', error.message);
  }
}

// ─── Backoff helpers (shared with retry cron) ─────────────────────────────────

/**
 * Milliseconds to wait before the next send attempt, given how many
 * attempts have already been recorded.
 *
 *   attempts=0 or 1  →   1 min
 *   attempts=2       →   5 min
 *   attempts=3       →  15 min
 *   attempts=4       →   1 hr
 *   attempts≥5       →   6 hr  (shouldn't be reached; filtered out by MAX_EMAIL_ATTEMPTS)
 */
export function backoffMs(attempts: number): number {
  if (attempts <= 1) return 60_000;          //  1 min
  if (attempts === 2) return 5 * 60_000;     //  5 min
  if (attempts === 3) return 15 * 60_000;    // 15 min
  if (attempts === 4) return 60 * 60_000;    //  1 hr
  return 6 * 60 * 60_000;                    //  6 hr
}

/**
 * True if the row is ready for a retry attempt given its current state.
 *
 * @param attempts        Value of `email_attempts` from the DB row.
 * @param lastAttemptAt   ISO-8601 string from `last_email_attempt_at`, or null.
 */
export function isReadyForRetry(attempts: number, lastAttemptAt: string | null): boolean {
  if (attempts >= MAX_EMAIL_ATTEMPTS) return false;
  if (!lastAttemptAt) return true; // pending orphan — never attempted
  const elapsed = Date.now() - new Date(lastAttemptAt).getTime();
  return elapsed >= backoffMs(attempts);
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Attempts to deliver a feedback notification email via all configured providers.
 * Handles its own DB status transitions — callers never need to update the row.
 *
 * Flow:
 *  1. Atomically claim the row (transition → 'retrying').
 *  2. Try each provider in order; stop on first success.
 *  3. On success → mark 'sent'.
 *  4. On total failure → mark 'failed', store error, increment attempts.
 *
 * @param service          Service-role Supabase client (bypasses RLS).
 * @param feedbackId       UUID of the `feedbacks` row.
 * @param payload          Full feedback payload used to render the email.
 * @param currentAttempts  Current value of `email_attempts` in the DB row.
 *
 * Returns true if the email was delivered. Returns false if all providers
 * failed or the row could not be claimed (already processing elsewhere).
 * Never throws.
 */
export async function sendFeedbackEmail(
  service: SupabaseClient,
  feedbackId: string,
  payload: FeedbackPayload,
  currentAttempts: number,
): Promise<boolean> {
  // Claim the row — prevents concurrent sends for the same submission.
  const claimed = await claimEmailRow(service, feedbackId);
  if (!claimed) {
    console.warn(`[email-sender] Row ${feedbackId} already claimed — skipping`);
    return false;
  }

  const providers = getProviders();
  const errors: string[] = [];

  for (const provider of providers) {
    const result = await provider.send(payload);
    if (result.ok) {
      await markEmailSent(service, feedbackId);
      console.info(`[email-sender] ✓ Delivered via ${provider.name} (id=${feedbackId})`);
      return true;
    }
    const msg = `[${provider.name}] ${result.error ?? 'unknown error'}`;
    console.warn(`[email-sender] ✗ ${msg} (id=${feedbackId})`);
    errors.push(msg);
  }

  // All providers failed — record for retry.
  const combined = errors.join(' | ');
  await markEmailFailed(service, feedbackId, currentAttempts, combined);
  console.error(
    `[email-sender] All providers failed for ${feedbackId} (attempt ${currentAttempts + 1}/${MAX_EMAIL_ATTEMPTS}): ${combined}`,
  );
  return false;
}
