import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  fetchRazorpayOrder,
  verifyPaymentSignature,
} from '@/lib/razorpay/client';
import { activatePlanAfterPayment } from '@/lib/razorpay/activate-plan';
import { toActivationApiBody, shouldTrackPaymentCompleted } from '@/lib/razorpay/activation-api-response';
import { isPaidPlanId } from '@/lib/pricing/plans';
import { paymentVerifySchema } from '@/lib/validations/schemas';
import { paymentError, paymentLog, paymentWarn } from '@/lib/razorpay/payment-log';
import { trackProductEventServer } from '@/lib/analytics/product-events-server';
import { resolveExpectedOrderAmount } from '@/lib/razorpay/expected-order-amount';

/**
 * Client payment verification — validates Razorpay payload, then delegates
 * activation to activatePlanAfterPayment() (same path as webhook).
 *
 * Expected amount comes from payments.amount (list or discounted at create-order),
 * never the static plan list price alone.
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

  const service = createServiceClient();
  const expected = await resolveExpectedOrderAmount(service, razorpay_order_id, isPaidPlanId);

  if (!expected.ok) {
    paymentError('verify', 'expected_amount_resolve_failed', {
      user_id: user.id,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      code: expected.code,
      error: expected.error,
    });
    const status = expected.code === 'not_found' ? 404 : 400;
    return NextResponse.json({ ok: false, error: expected.error }, { status });
  }

  if (expected.userId !== user.id) {
    paymentWarn('verify', 'payment_row_user_mismatch', {
      user_id: user.id,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
    });
    return NextResponse.json(
      { ok: false, error: 'Order does not belong to this user.' },
      { status: 403 },
    );
  }

  if (expected.plan !== notesPlan) {
    paymentError('verify', 'plan_mismatch', {
      user_id: user.id,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      notes_plan: notesPlan,
      payment_plan: expected.plan,
    });
    return NextResponse.json({ ok: false, error: 'Plan mismatch for this order.' }, { status: 400 });
  }

  // Authoritative: payments.amount (discounted or list) must match Razorpay order.
  if (remoteOrder.amount !== expected.amountPaise) {
    paymentError('verify', 'amount_mismatch', {
      user_id: user.id,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      expected: expected.amountPaise,
      actual: remoteOrder.amount,
    });
    return NextResponse.json({ ok: false, error: 'Order amount mismatch.' }, { status: 400 });
  }

  const result = await activatePlanAfterPayment(service, {
    userId: user.id,
    plan: expected.plan,
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    amountPaise: expected.amountPaise,
    source: 'verify',
  });

  const apiBody = toActivationApiBody(result, expected.plan);

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
    trackProductEventServer({
      event_name: 'payment_completed',
      user_id: user.id,
      plan: expected.plan,
      amount: expected.amountPaise,
      payment_id: razorpay_payment_id,
      source: 'verify',
    });
  }

  paymentLog('verify', 'verify_success', {
    user_id: user.id,
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
    activated: apiBody.activated,
    alreadyActivated: apiBody.alreadyActivated,
    plan: expected.plan,
    amount: expected.amountPaise,
  });

  return NextResponse.json(apiBody);
}
