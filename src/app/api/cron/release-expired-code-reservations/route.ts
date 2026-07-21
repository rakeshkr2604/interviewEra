/**
 * GET /api/cron/release-expired-code-reservations
 *
 * Releases campaign_code_redemptions stuck in status=reserved for >30 minutes
 * (abandoned checkouts). Calls release_stale_campaign_reservations RPC which
 * decrements campaign_codes.redemption_count atomically per release.
 *
 * vercel.json: once daily at 02:45 UTC (Hobby plan forbids sub-daily crons).
 * Primary release paths remain client dismiss/fail + webhook payment.failed
 * + reserve-on-retry (migration 063); this cron is a daily sweep only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { releaseStaleCampaignReservations } from '@/lib/campaign-codes';

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const svc = createServiceClient();
  try {
    const released = await releaseStaleCampaignReservations(svc, 30);
    console.info('[cron:release-expired-code-reservations]', { released });
    return NextResponse.json({ ok: true, released });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron:release-expired-code-reservations] failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
