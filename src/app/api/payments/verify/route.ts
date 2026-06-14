import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  fetchRazorpayOrder,
  verifyPaymentSignature,
} from '@/lib/razorpay/client';
import { activatePlanAfterPayment } from '@/lib/razorpay/activate-plan';
import { toActivationApiBody, shouldTrackPaymentCompleted } from '@/lib/razorpay/activation-api-response';
import { getPaidPlan, isPaidPlanId } from '@/lib/pricing/plans';
import { paymentVerifySchema } from '@/lib/validations/schemas';
import { paymentError, paymentLog, paymentWarn } from '@/lib/razorpay/payment-log';
import { trackFunnelEvent } from '@/lib/analytics/funnel';

/**
 * Client payment verification — validates Razorpay payload, then delegates
 * activation to activatePlanAfterPayment() (same path as webhook).
 */
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

  paymentLog('verify', 'verify_start', {
    user_id: user.id,
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
  });

  if (!process.env.RAZORPAY_KEY_SECRET) {
    paymentError('verify', 'missing_key_secret', { user_id: user.id });
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
      user_id: user.id,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      signature_valid: false,
    });
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 400 });
  }

  paymentLog('verify', 'signature_ok', {
    user_id: user.id,
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
    signature_valid: true,
  });

  let remoteOrder;
  try {
    remoteOrder = await fetchRazorpayOrder(razorpay_order_id);
    paymentLog('verify', 'order_fetch_ok', {
      user_id: user.id,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      status: remoteOrder.status,
      amount: remoteOrder.amount,
    });
  } catch (err) {
    paymentError('verify', 'order_fetch_failed', {
      user_id: user.id,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      error: err instanceof Error ? err.message : 'unknown',
    });
    return NextResponse.json(
      { ok: false, error: 'Could not confirm order with payment provider.' },
      { status: 502 },
    );
  }

  const notesUserId = remoteOrder.notes?.['user_id'];
  const notesPlan = remoteOrder.notes?.['plan'];
  if (notesUserId !== user.id) {
    paymentWarn('verify', 'order_user_mismatch', {
      user_id: user.id,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
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
      user_id: user.id,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
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

  const apiBody = toActivationApiBody(result, notesPlan);

  if (apiBody.activationFailed) {
    paymentError('verify', 'activation_failed', {
      user_id: user.id,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      error: apiBody.error,
    });
    return NextResponse.json(apiBody, { status: 500 });
  }

  if (shouldTrackPaymentCompleted(result)) {
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

  paymentLog('verify', 'verify_success', {
    user_id: user.id,
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
    activated: apiBody.activated,
    alreadyActivated: apiBody.alreadyActivated,
    plan: notesPlan,
  });

  return NextResponse.json(apiBody);
}
