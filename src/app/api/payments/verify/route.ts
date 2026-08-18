import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  fetchRazorpayOrder,
  fetchRazorpayPayment,
  verifyPaymentSignature,
} from '@/lib/razorpay/client';
import { activatePlanAfterPayment } from '@/lib/razorpay/activate-plan';
import { toActivationApiBody, shouldTrackPaymentCompleted } from '@/lib/razorpay/activation-api-response';
import { isPaidPlanId } from '@/lib/pricing/plans';
import { paymentVerifySchema } from '@/lib/validations/schemas';
import { paymentError, paymentLog, paymentWarn } from '@/lib/razorpay/payment-log';
import { trackProductEventServer } from '@/lib/analytics/product-events-server';
import { resolveExpectedOrderAmount } from '@/lib/razorpay/expected-order-amount';
import { validateProviderPaymentAgainstLocalExpectation } from '@/lib/razorpay/provider-payment-validation';

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
  let remotePayment;
  try {
    [remoteOrder, remotePayment] = await Promise.all([
      fetchRazorpayOrder(razorpay_order_id),
      fetchRazorpayPayment(razorpay_payment_id),
    ]);
    paymentLog('verify', 'order_fetch_ok', {
      user_id: user.id,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      status: remoteOrder.status,
      amount: remoteOrder.amount,
    });
  } catch (err) {
    paymentError('verify', 'provider_entity_fetch_failed', {
      user_id: user.id,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      error: err instanceof Error ? err.message : 'unknown',
    });
    return NextResponse.json(
      { ok: false, error: 'Could not confirm payment with payment provider.' },
      { status: 502 },
    );
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

  const providerValidation = validateProviderPaymentAgainstLocalExpectation(
    remotePayment,
    remoteOrder,
    {
      userId: expected.userId,
      plan: expected.plan,
      orderId: razorpay_order_id,
      amountPaise: expected.amountPaise,
      currency: expected.currency,
      campaignRedemptionId: expected.campaignRedemptionId,
    },
    razorpay_payment_id,
  );
  if (!providerValidation.ok) {
    paymentWarn('verify', `provider_${providerValidation.code}`, {
      user_id: user.id,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      expected: providerValidation.expected,
      actual: providerValidation.actual,
    });
    return NextResponse.json(
      { ok: false, error: 'Payment details could not be confirmed.' },
      { status: 400 },
    );
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
      order_id: razorpay_order_id,
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
