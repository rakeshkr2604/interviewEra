/**
 * Bounded Resend delivery for campus bulk invites.
 * Does not claim exactly-once delivery — provider acceptance ≠ inbox delivery.
 */

import { Resend } from 'resend';

const BATCH_SIZE = 50;

export type BulkInviteSendItem = {
  email: string;
  token: string;
};

export type BulkInviteSendResult = {
  accepted: number;
  emailErrors: number;
  /** Provider accepted but we cannot prove mailbox delivery. */
  unknownOutcomes: number;
};

function isProviderAccepted(result: unknown): boolean {
  if (!result || typeof result !== 'object') return false;
  const r = result as { data?: { id?: string } | null; error?: unknown; id?: string };
  if (r.error) return false;
  if (r.data && typeof r.data === 'object' && typeof r.data.id === 'string') return true;
  // Older SDK shapes
  if (typeof r.id === 'string') return true;
  return false;
}

/**
 * Send invite emails in batches. Counts Resend `{ error }` responses as failures
 * (SDK often resolves instead of rejecting).
 */
export async function sendCampusInviteEmails(args: {
  invites: BulkInviteSendItem[];
  from: string;
  subjectFor: (invite: BulkInviteSendItem) => string;
  htmlFor: (invite: BulkInviteSendItem) => string;
  logPrefix: string;
}): Promise<BulkInviteSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error(`${args.logPrefix} RESEND_API_KEY missing — skipping sends`);
    return {
      accepted: 0,
      emailErrors: args.invites.length,
      unknownOutcomes: 0,
    };
  }

  const resend = new Resend(apiKey);
  let accepted = 0;
  let emailErrors = 0;
  let unknownOutcomes = 0;

  for (let i = 0; i < args.invites.length; i += BATCH_SIZE) {
    const batch = args.invites.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((invite) =>
        resend.emails.send({
          from: args.from,
          to: invite.email,
          subject: args.subjectFor(invite),
          html: args.htmlFor(invite),
        }),
      ),
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        emailErrors++;
        console.error(
          JSON.stringify({
            event: 'bulk_invite_email_rejected',
            prefix: args.logPrefix,
            // No recipient PII in logs
          }),
        );
        continue;
      }
      if (isProviderAccepted(result.value)) {
        accepted++;
      } else {
        // Resolved with error object, or ambiguous shape
        const value = result.value as { error?: unknown } | null;
        if (value && typeof value === 'object' && value.error) {
          emailErrors++;
          console.error(
            JSON.stringify({
              event: 'bulk_invite_email_provider_error',
              prefix: args.logPrefix,
            }),
          );
        } else {
          unknownOutcomes++;
          console.warn(
            JSON.stringify({
              event: 'bulk_invite_email_unknown_outcome',
              prefix: args.logPrefix,
            }),
          );
        }
      }
    }
  }

  return { accepted, emailErrors, unknownOutcomes };
}
