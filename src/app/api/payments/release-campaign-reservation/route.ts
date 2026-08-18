/**
 * POST /api/payments/release-campaign-reservation
 *
 * Backward-compatible no-op for order-bound reservations. Signed-in users may
 * identify only their own order; the database RPC rejects bound releases.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { releaseCampaignReservationForOrder } from '@/lib/campaign-codes';
import { paymentLog, paymentWarn } from '@/lib/razorpay/payment-log';

const schema = z.object({
  order_id: z.string().min(1).max(128),
});

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid order_id' }, { status: 400 });
  }

  const { order_id: orderId } = parsed.data;
  const svc = createServiceClient();

  const { data: payment, error: payErr } = await svc
    .from('payments')
    .select('user_id, campaign_redemption_id, status')
    .eq('order_id', orderId)
    .maybeSingle();

  if (payErr) {
    paymentWarn('checkout', 'release_reservation_lookup_failed', {
      order_id: orderId,
      user_id: user.id,
      error: payErr.message,
    });
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }

  if (!payment || payment.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Never release after successful payment activation.
  if (payment.status === 'paid') {
    return NextResponse.json({ ok: true, released: false, reason: 'already_paid' });
  }

  const { released, redemptionId } = await releaseCampaignReservationForOrder(svc, orderId);

  paymentLog('checkout', 'campaign_reservation_released', {
    order_id: orderId,
    user_id: user.id,
    redemption_id: redemptionId,
    released,
  });

  return NextResponse.json({
    ok: true,
    released,
    reason: released ? 'released' : 'bound_order_retained',
  });
}

export const runtime = 'nodejs';
