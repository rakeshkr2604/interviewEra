import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  fetchRazorpayOrder,
  verifyPaymentSignature,
} from '@/lib/razorpay/client';
import { activatePlanAfterPayment } from '@/lib/razorpay/activate-plan';
import { getPaidPlan, isPaidPlanId } from '@/lib/pricing/plans';
import { paymentVerifySchema } from '@/lib/validations/schemas';
import { paymentError, paymentLog, paymentWarn } from '@/lib/razorpay/payment-log';
import { trackFunnelEvent } from '@/lib/analytics/funnel';

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

  const validation = paymentVerifySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { ok: false, error: validation.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = validation.data;

  paymentLog('verify', 'request', {
    userId: user.id,
    orderIdPrefix: razorpay_order_id.slice(0, 8),
    paymentIdPrefix: razorpay_payment_id.slice(0, 8),
  });

  if (!process.env.RAZORPAY_KEY_SECRET) {
    paymentError('verify', 'missing_key_secret', {});
    return NextResponse.json(
      { ok: false, error: 'Payment configuration error.' },
      { status: 500 },
    );
  }

  const signatureValid = verifyPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  );

  if (!signatureValid) {
    paymentWarn('verify', 'signature_rejected', {
      userId: user.id,
      orderIdPrefix: razorpay_order_id.slice(0, 8),
    });
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 400 });
  }

  let remoteOrder;
  try {
    remoteOrder = await fetchRazorpayOrder(razorpay_order_id);
  } catch (err) {
    paymentError('verify', 'order_fetch_failed', {
      orderIdPrefix: razorpay_order_id.slice(0, 8),
      error: err instanceof Error ? err.message : 'unknown',
    });
    return NextResponse.json(
      { ok: false, error: 'Could not confirm order with payment provider.' },
      { status: 502 },
    );
  }

  if (remoteOrder.status !== 'paid') {
    paymentWarn('verify', 'order_status_not_paid_yet', {
      orderIdPrefix: razorpay_order_id.slice(0, 8),
      status: remoteOrder.status,
    });
    // Checkout handler only runs after success; proceed when signature is valid.
  }

  const notesUserId = remoteOrder.notes?.['user_id'];
  const notesPlan = remoteOrder.notes?.['plan'];
  if (notesUserId !== user.id) {
    paymentWarn('verify', 'order_user_mismatch', {
      userId: user.id,
      orderIdPrefix: razorpay_order_id.slice(0, 8),
    });
    return NextResponse.json(
      { ok: false, error: 'Order does not belong to this user.' },
      { status: 403 },
    );
  }

  if (!isPaidPlanId(notesPlan)) {
    return NextResponse.json({ ok: false, error: 'Invalid plan on order.' }, { status: 400 });
  }

  const planConfig = getPaidPlan(notesPlan);
  if (remoteOrder.amount !== planConfig.amountPaise) {
    paymentError('verify', 'amount_mismatch', {
      orderIdPrefix: razorpay_order_id.slice(0, 8),
      expected: planConfig.amountPaise,
      actual: remoteOrder.amount,
    });
    return NextResponse.json({ ok: false, error: 'Order amount mismatch.' }, { status: 400 });
  }

  const service = createServiceClient();
  const result = await activatePlanAfterPayment(service, {
    userId: user.id,
    plan: notesPlan,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    amountPaise: planConfig.amountPaise,
    source: 'verify',
  });

  if (!result.ok) {
    paymentError('verify', 'activation_failed', {
      userId: user.id,
      error: result.error,
    });
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  if (!result.skipped) {
    trackFunnelEvent(
      'payment_completed',
      {
        userId: user.id,
        plan: notesPlan,
        amount: planConfig.amountPaise,
        paymentId: razorpay_payment_id,
        source: 'verify',
      },
      { ga4: false },
    );
  }

  paymentLog('verify', 'success', {
    userId: user.id,
    plan: notesPlan,
    skipped: result.skipped,
    planExpiresAt: result.planExpiresAt,
  });

  return NextResponse.json({
    ok: true,
    plan: notesPlan,
    planExpiresAt: result.planExpiresAt,
    skipped: result.skipped,
  });
}
