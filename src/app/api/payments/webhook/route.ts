import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/razorpay/client';
import { activatePlanAfterPayment } from '@/lib/razorpay/activate-plan';
import { shouldTrackPaymentCompleted } from '@/lib/razorpay/activation-api-response';
import { isPaidPlanId } from '@/lib/pricing/plans';
import { paymentError, paymentLog, paymentWarn } from '@/lib/razorpay/payment-log';
import { trackFunnelEvent } from '@/lib/analytics/funnel';

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

      const { data: paymentRow, error: rowErr } = await supabase
        .from('payments')
        .select('user_id, plan, amount')
        .eq('order_id', orderId)
        .maybeSingle();

      if (rowErr) {
        throw new Error(rowErr.message);
      }

      if (!paymentRow) {
        paymentWarn('webhook', 'unknown_order', {
          order_id: orderId,
          payment_id: paymentId,
          eventId,
        });
        return NextResponse.json({ ok: true });
      }

      if (!isPaidPlanId(paymentRow.plan)) {
        paymentWarn('webhook', 'invalid_plan_on_row', {
          order_id: orderId,
          payment_id: paymentId,
          plan: paymentRow.plan,
        });
        return NextResponse.json({ ok: true });
      }

      paymentLog('webhook', 'activation_dispatch', {
        event: event.event,
        order_id: orderId,
        payment_id: paymentId,
        user_id: paymentRow.user_id,
      });

      const result = await activatePlanAfterPayment(supabase, {
        userId: paymentRow.user_id,
        plan: paymentRow.plan,
        orderId,
        paymentId,
        amountPaise: Number(paymentRow.amount),
        source: 'webhook',
      });

      if ('activationFailed' in result && result.activationFailed) {
        paymentError('webhook', 'activation_failed', {
          order_id: orderId,
          payment_id: paymentId,
          user_id: paymentRow.user_id,
          error: result.error,
        });
        return NextResponse.json({ error: 'Activation failed' }, { status: 500 });
      }

      if (shouldTrackPaymentCompleted(result)) {
        trackFunnelEvent(
          'payment_completed',
          {
            userId: paymentRow.user_id,
            plan: paymentRow.plan,
            amount: Number(paymentRow.amount),
            paymentId,
            source: 'webhook',
          },
          { ga4: false },
        );
      }

      paymentLog('webhook', 'webhook_success', {
        order_id: orderId,
        payment_id: paymentId,
        user_id: paymentRow.user_id,
        activated: result.activated,
        alreadyActivated: result.alreadyActivated,
      });

      return NextResponse.json({ ok: true });
    }

    if (event.event === 'payment.failed') {
      const payment = paymentEntity;
      if (!payment?.order_id) {
        return NextResponse.json({ ok: true });
      }

      const { error } = await supabase
        .from('payments')
        .update({ status: 'failed', updated_at: now })
        .eq('order_id', payment.order_id)
        .in('status', ['created']);

      if (error) throw new Error(error.message);

      paymentLog('webhook', 'payment_failed', {
        order_id: payment.order_id,
        payment_id: payment.id,
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
