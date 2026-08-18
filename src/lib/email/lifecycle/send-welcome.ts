import { createServiceClient } from '@/lib/supabase/server';
import { getEmailAppUrl } from '@/lib/server/get-base-url';
import { hasVerifiedEmail } from '@/lib/auth/verified-email-policy';
import { sendLifecycleTemplate } from './send-template';

const LOG_PREFIX = '[welcome-email]';

export interface SendWelcomeEmailResult {
  sent: boolean;
  skipped: boolean;
  error?: string;
}

/**
 * Sends WelcomeEmail once after the account is verified (email confirm or OAuth).
 */
export async function sendWelcomeEmailIfNeeded(userId: string): Promise<SendWelcomeEmailResult> {
  const supabase = createServiceClient();

  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
  if (authError || !authUser?.user?.email) {
    console.error(`${LOG_PREFIX} user lookup failed`, authError?.message);
    return { sent: false, skipped: false, error: authError?.message ?? 'User not found' };
  }

  const user = authUser.user;
  if (!hasVerifiedEmail(user)) {
    console.info(`${LOG_PREFIX} skip unverified user`, { userId });
    return { sent: false, skipped: true };
  }

  const email = user.email;
  if (!email) {
    return { sent: false, skipped: true };
  }

  const { data: profile } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', userId)
    .maybeSingle();

  const name =
    (typeof profile?.name === 'string' && profile.name.trim()) ||
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    'there';

  const baseUrl = getEmailAppUrl();
  const dashboardUrl = `${baseUrl}/dashboard`;

  return sendLifecycleTemplate({
    template: 'welcome',
    to: email,
    userId,
    idempotencyKey: `welcome:${userId}`,
    props: { name, dashboardUrl },
    text: `Welcome to InterviewEra! Open your dashboard: ${dashboardUrl}`,
  });
}
