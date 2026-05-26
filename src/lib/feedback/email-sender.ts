/**
 * Feedback email sender — provider-abstracted, DB-status-tracked.
 *
 * Keeps the EmailProvider interface so a second provider (SendGrid, SMTP) can
 * be added by appending a class to getProviders(). Everything else is intentionally
 * minimal: no background queue, no claim locks, no backoff — just send and record
 * the outcome so the platform-admin retry button has accurate state to act on.
 */

import { Resend } from 'resend';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildSubject,
  buildFeedbackEmailHtml,
  buildFeedbackEmailText,
  type FeedbackPayload,
} from '@/lib/email/feedback-notification';

// ─── Provider interface ───────────────────────────────────────────────────────

export interface EmailSendResult {
  ok: boolean;
  /** Present only when ok = false. */
  error?: string;
}

export interface EmailProvider {
  /** Short stable identifier shown in logs ("resend", "sendgrid", …). */
  readonly name: string;
  send(payload: FeedbackPayload): Promise<EmailSendResult>;
}

// ─── Resend provider ──────────────────────────────────────────────────────────

const FROM_EMAIL = 'InterviewEra <transactional@interviewera.com>';

function founderEmail(): string {
  return process.env.FOUNDER_FEEDBACK_EMAIL?.trim() || 'Rakesh.kr2604@gmail.com';
}

class ResendProvider implements EmailProvider {
  readonly name = 'resend';

  async send(payload: FeedbackPayload): Promise<EmailSendResult> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not configured' };

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
 * Ordered list of providers tried in sequence.
 * To add a fallback: append new SendGridProvider() or new SmtpProvider() here.
 */
function getProviders(): EmailProvider[] {
  return [new ResendProvider()];
}

// ─── DB status helpers ────────────────────────────────────────────────────────

async function markEmailSent(service: SupabaseClient, feedbackId: string): Promise<void> {
  const { error } = await service
    .from('feedbacks')
    .update({
      email_status: 'sent',
      last_email_attempt_at: new Date().toISOString(),
    })
    .eq('id', feedbackId);
  if (error) console.error('[email-sender] markEmailSent error:', error.message);
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
  if (error) console.error('[email-sender] markEmailFailed error:', error.message);
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Attempts to deliver a feedback notification email via configured providers.
 * Records the outcome in the `feedbacks` row regardless of success or failure.
 *
 * @param service          Service-role Supabase client (bypasses RLS).
 * @param feedbackId       UUID of the `feedbacks` row.
 * @param payload          Full feedback payload for email rendering.
 * @param currentAttempts  Current `email_attempts` value from the DB row.
 *
 * Returns true on delivery, false on failure. Never throws.
 */
export async function sendFeedbackEmail(
  service: SupabaseClient,
  feedbackId: string,
  payload: FeedbackPayload,
  currentAttempts: number,
): Promise<boolean> {
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

  const combined = errors.join(' | ');
  await markEmailFailed(service, feedbackId, currentAttempts, combined);
  console.error(
    `[email-sender] All providers failed for ${feedbackId} (attempt ${currentAttempts + 1}): ${combined}`,
  );
  return false;
}
