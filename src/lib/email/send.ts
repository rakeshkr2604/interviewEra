import { resend } from './resend';

export interface SendEmailPayload {
  to: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  /** Optional custom headers (e.g. List-Unsubscribe for marketing digests). */
  headers?: Record<string, string>;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Sends a transactional email using the shared Resend client singleton.
 * Logs success or failure internally and returns a clean standardized result.
 */
export async function sendEmail({
  to,
  from = process.env.SENDER_EMAIL_NO_REPLY || 'InterviewEra <noreply@interviewera.com>',
  replyTo,
  subject,
  html,
  text,
  headers,
}: SendEmailPayload): Promise<SendEmailResult> {
  const recipient = Array.isArray(to) ? to.join(', ') : to;
  console.info(`[email] Attempting to send email. To: ${recipient}, Subject: "${subject}"`);

  try {
    const response = await resend.emails.send({
      from,
      to,
      replyTo,
      subject,
      html,
      text,
      ...(headers ? { headers } : {}),
    });

    if (response.error) {
      const errorMsg = response.error.message || JSON.stringify(response.error);
      console.error(`[email] Resend returned sending error: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    console.info(`[email] Successfully delivered email via Resend (id=${response.data?.id})`);
    return { success: true, id: response.data?.id };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[email] Resend client threw unhandled exception: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}
