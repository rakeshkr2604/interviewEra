import { Resend } from 'resend';
import { requireEnv } from './env';

/**
 * Validates Resend credentials before the live campaign sends to all recipients.
 */
export async function verifyResendApiKey(): Promise<void> {
  const apiKey = requireEnv('RESEND_API_KEY');

  if (!apiKey.startsWith('re_')) {
    throw new Error(
      'RESEND_API_KEY looks invalid (expected format: re_...). Copy a live key from https://resend.com/api-keys',
    );
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.domains.list();

  if (error) {
    throw new Error(`Resend API key check failed: ${error.message}`);
  }
}
