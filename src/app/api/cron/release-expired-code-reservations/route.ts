/**
 * GET /api/cron/release-expired-code-reservations
 *
 * Releases only unbound campaign_code_redemptions stuck in status=reserved for
 * >30 minutes (server failure before Razorpay-order attachment). Bound orders
 * are intentionally retained because Razorpay has no terminal unpaid state.
 *
 * vercel.json: once daily at 02:45 UTC (Hobby plan forbids sub-daily crons).
 * Provider initialization failure releases its exact unbound reservation in
 * create-order; this cron is the crash-recovery backstop.
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
