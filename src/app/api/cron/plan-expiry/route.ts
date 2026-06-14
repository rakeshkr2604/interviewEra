import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { paymentError, paymentLog } from '@/lib/razorpay/payment-log';

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

/**
 * Daily plan expiry — downgrades starter/pro users whose plan_expires_at has passed.
 *
 * Vercel cron (vercel.json): { "path": "/api/cron/plan-expiry", "schedule": "30 0 * * *" }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data: expiredUsers, error: selectErr } = await supabase
    .from('users')
    .select('id, plan_tier')
    .in('plan_tier', ['starter', 'pro'])
    .eq('plan_status', 'active')
    .lt('plan_expires_at', now);

  if (selectErr) {
    paymentError('expiry', 'select_failed', { code: selectErr.code });
    return NextResponse.json({ error: selectErr.message }, { status: 500 });
  }

  const ids = (expiredUsers ?? []).map((u) => u.id as string);
  if (ids.length === 0) {
    paymentLog('expiry', 'none_expired', {});
    return NextResponse.json({ ok: true, downgraded: 0 });
  }

  const { error: updateErr } = await supabase
    .from('users')
    .update({ plan_tier: 'free', plan_status: 'expired' })
    .in('id', ids);

  if (updateErr) {
    paymentError('expiry', 'update_failed', { code: updateErr.code, count: ids.length });
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  paymentLog('expiry', 'downgraded', { count: ids.length });

  return NextResponse.json({ ok: true, downgraded: ids.length });
}
