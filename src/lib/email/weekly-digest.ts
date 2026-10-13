import { createHmac, timingSafeEqual } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { getEmailAppUrl } from '@/lib/server/get-base-url';
import { sendLifecycleTemplate } from '@/lib/email/lifecycle/send-template';
import { buildListUnsubscribeHeaders } from '@/lib/email/list-unsubscribe';
import { getDefaultInterviewStartUrl } from '@/lib/interview/default-interview-start-path';
import {
  buildUserDigestFromBundle,
  prefetchWeeklyDigestBundle,
  weeklyDigestWindows,
  type DigestPayload,
} from '@/lib/email/weekly-digest-data';

// ─── Unsubscribe token helpers ────────────────────────────────────────────────

export function generateUnsubToken(userId: string): string {
  if (!process.env.UNSUBSCRIBE_SECRET) {
    throw new Error('UNSUBSCRIBE_SECRET env var is not set');
  }
  return createHmac('sha256', process.env.UNSUBSCRIBE_SECRET)
    .update(userId)
    .digest('hex');
}

export function verifyUnsubToken(userId: string, token: string): boolean {
  try {
    const expected = Buffer.from(generateUnsubToken(userId), 'hex');
    const actual = Buffer.from(token, 'hex');
    if (expected.length !== actual.length) return false;
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function composeUserDigest(
  user: Parameters<typeof buildUserDigestFromBundle>[0],
  bundle: Parameters<typeof buildUserDigestFromBundle>[1],
  windows: Parameters<typeof buildUserDigestFromBundle>[2],
): DigestPayload | null {
  const baseUrl = getEmailAppUrl();
  const unsubToken = generateUnsubToken(user.id);
  return buildUserDigestFromBundle(user, bundle, windows, {
    baseUrl,
    practiceUrl: getDefaultInterviewStartUrl(baseUrl),
    unsubscribeUrl: `${baseUrl}/api/email/unsubscribe?userId=${encodeURIComponent(user.id)}&token=${unsubToken}`,
  });
}

async function sendDigest(data: DigestPayload): Promise<boolean> {
  const result = await sendLifecycleTemplate({
    template: 'weekly_progress',
    to: data.user.email,
    userId: data.user.id,
    idempotencyKey: data.idempotencyKey,
    props: data.templateProps as unknown as Record<string, unknown>,
    text: `Your weekly InterviewEra progress: ${data.lastWeekCount} interviews, avg score ${data.currentWeekScore}/100.`,
    headers: buildListUnsubscribeHeaders(data.templateProps.unsubscribeUrl),
  });

  if (!result.sent && !result.skipped) {
    console.error(`[weekly-digest] Failed to send to ${data.user.email}:`, result.error);
    return false;
  }

  return result.sent;
}

export async function runWeeklyDigest(): Promise<{ sent: number; skipped: number }> {
  const supabase = createServiceClient();
  const windows = weeklyDigestWindows();
  const bundle = await prefetchWeeklyDigestBundle(supabase, windows);
  if (!bundle) {
    return { sent: 0, skipped: 0 };
  }

  let sent = 0;
  let skipped = 0;

  for (const user of bundle.users) {
    if (!user.email?.trim()) {
      skipped++;
      continue;
    }
    const digestData = composeUserDigest(user, bundle, windows);
    if (!digestData) {
      skipped++;
      continue;
    }
    const delivered = await sendDigest(digestData);
    if (delivered) {
      sent++;
    } else {
      skipped++;
    }
  }

  return { sent, skipped };
}
