import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  fetchRazorpayOrder,
  fetchRazorpayPayment,
  verifyWebhookSignature,
} from '@/lib/razorpay/client';
import { activatePlanAfterPayment } from '@/lib/razorpay/activate-plan';
import { shouldTrackPaymentCompleted } from '@/lib/razorpay/activation-api-response';
import { isPaidPlanId } from '@/lib/pricing/plans';
import { paymentError, paymentLog, paymentWarn } from '@/lib/razorpay/payment-log';
import { trackProductEventServer } from '@/lib/analytics/product-events-server';
import { resolveExpectedOrderAmount } from '@/lib/razorpay/expected-order-amount';
import { validateProviderPaymentAgainstLocalExpectation } from '@/lib/razorpay/provider-payment-validation';
import { evaluateWebhookSupabaseIsolation } from '@/lib/env/staging-environment';

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
}

interface RazorpayOrderEntity {
  id: string;
  amount: number;
  currency: string;
  status: string;
  notes?: Record<string, string>;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: { entity: RazorpayPaymentEntity };
    order?: { entity: RazorpayOrderEntity };
  };
}

const ACTIVATION_EVENTS = new Set(['payment.captured', 'order.paid']);

export async function POST(request: Request): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';
  const eventId = request.headers.get('x-razorpay-event-id') ?? undefined;

  if (!verifyWebhookSignature(rawBody, signature)) {
    paymentWarn('webhook', 'invalid_signature', { eventId });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    paymentWarn('webhook', 'invalid_json', { eventId });
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const paymentEntity = event.payload.payment?.entity;
  const orderEntity = event.payload.order?.entity;
  const orderId = paymentEntity?.order_id ?? orderEntity?.id;
  const paymentId = paymentEntity?.id;

  paymentLog('webhook', 'webhook_received', {
    event: event.event,
    eventId,
    order_id: orderId,
    payment_id: paymentId,
  });

  // After signature + parse, before any DB client: Preview/staging Supabase target lock.
  // VERCEL_ENV=production / local unset APP_ENV is passthrough (no EXPECTED_SUPABASE_PROJECT_REF).
  const isolation = evaluateWebhookSupabaseIsolation();
  if (!isolation.ok) {
    paymentError('webhook', 'environment_isolation_failed', {
      eventId,
      order_id: orderId,
      payment_id: paymentId,
      code: isolation.code,
    });
    return NextResponse.json(
      { error: 'Webhook environment isolation failed' },
      { status: 500 },
    );
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  try {
    if (ACTIVATION_EVENTS.has(event.event)) {
      if (!orderId) {
        paymentWarn('webhook', 'missing_order_id', { event: event.event, eventId });
        return NextResponse.json({ ok: true });
      }

      if (!paymentId) {
        paymentWarn('webhook', 'missing_payment_id', {
          event: event.event,
          order_id: orderId,
          eventId,
        });
        return NextResponse.json({ ok: true });
      }

      const expected = await resolveExpectedOrderAmount(supabase, orderId, isPaidPlanId);

      if (!expected.ok) {
        paymentWarn('webhook', 'expected_amount_resolve_failed', {
          order_id: orderId,
          payment_id: paymentId,
          eventId,
          code: expected.code,
          error: expected.error,
        });
        return NextResponse.json({ ok: true });
      }

      let providerPayment;
      let providerOrder;
      try {
        [providerPayment, providerOrder] = await Promise.all([
          fetchRazorpayPayment(paymentId),
          fetchRazorpayOrder(orderId),
        ]);
      } catch (err) {
        paymentError('webhook', 'provider_entity_fetch_failed', {
          order_id: orderId,
          payment_id: paymentId,
          eventId,
          error: err instanceof Error ? err.message : 'unknown',
        });
        return NextResponse.json({ error: 'Webhook provider verification failed' }, { status: 500 });
      }

      const providerValidation = validateProviderPaymentAgainstLocalExpectation(
        providerPayment,
        providerOrder,
        {
          userId: expected.userId,
          plan: expected.plan,
          orderId,
          amountPaise: expected.amountPaise,
          currency: expected.currency,
          campaignRedemptionId: expected.campaignRedemptionId,
        },
        paymentId,
      );
      if (!providerValidation.ok) {
        paymentWarn('webhook', `provider_${providerValidation.code}`, {
          order_id: orderId,
          payment_id: paymentId,
          eventId,
          expected: providerValidation.expected,
          actual: providerValidation.actual,
        });
        return NextResponse.json({ ok: true });
      }

      paymentLog('webhook', 'activation_dispatch', {
        event: event.event,
        order_id: orderId,
        payment_id: paymentId,
        user_id: expected.userId,
        amount: expected.amountPaise,
      });

      const result = await activatePlanAfterPayment(supabase, {
        userId: expected.userId,
        plan: expected.plan,
        orderId,
        paymentId,
        amountPaise: expected.amountPaise,
        source: 'webhook',
      });

      if ('activationFailed' in result && result.activationFailed) {
        paymentError('webhook', 'activation_failed', {
          order_id: orderId,
          payment_id: paymentId,
          user_id: expected.userId,
          error: result.error,
        });
        return NextResponse.json({ error: 'Activation failed' }, { status: 500 });
      }

      if (shouldTrackPaymentCompleted(result)) {
        trackProductEventServer({
          event_name: 'payment_completed',
          user_id: expected.userId,
          plan: expected.plan,
          amount: expected.amountPaise,
          order_id: orderId,
          payment_id: paymentId,
          source: 'webhook',
          ...(expected.attributionSnapshot ?? {}),
        });
      }

      paymentLog('webhook', 'webhook_success', {
        order_id: orderId,
        payment_id: paymentId,
        user_id: expected.userId,
        activated: result.activated,
        alreadyActivated: result.alreadyActivated,
        amount: expected.amountPaise,
      });

      return NextResponse.json({ ok: true });
    }

    if (event.event === 'payment.failed') {
      const payment = paymentEntity;
      if (!payment?.order_id) {
        return NextResponse.json({ ok: true });
      }

      const expected = await resolveExpectedOrderAmount(
        supabase,
        payment.order_id,
        isPaidPlanId,
      );
      const { data: failedRows, error } = await supabase
        .from('payments')
        .update({ status: 'failed', updated_at: now })
        .eq('order_id', payment.order_id)
        .in('status', ['created'])
        .select('order_id');

      if (error) throw new Error(error.message);

      if ((failedRows?.length ?? 0) > 0 && expected.ok) {
        trackProductEventServer({
          event_name: 'payment_failed',
          user_id: expected.userId,
          plan: expected.plan,
          amount: expected.amountPaise,
          order_id: payment.order_id,
          payment_id: payment.id,
          payment_status: payment.status,
          failure_category: 'gateway_failed',
          source: 'webhook',
        });
      }

      paymentLog('webhook', 'payment_failed', {
        order_id: payment.order_id,
        payment_id: payment.id,
        campaign_reservation_released: false,
        reason: 'bound_order_may_still_be_paid',
      });
      return NextResponse.json({ ok: true });
    }

    paymentLog('webhook', 'ignored_event', { event: event.event, eventId });
  } catch (err) {
    paymentError('webhook', 'processing_failed', {
      event: event.event,
      eventId,
      order_id: orderId,
      payment_id: paymentId,
      error: err instanceof Error ? err.message : 'unknown',
    });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
