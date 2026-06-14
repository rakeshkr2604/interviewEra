import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyWebhookSignature } from '@/lib/razorpay/client';
import { paymentError, paymentLog, paymentWarn } from '@/lib/razorpay/payment-log';

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

  paymentLog('webhook', 'received', {
    event: event.event,
    eventId,
    orderId: event.payload.payment?.entity?.order_id ?? event.payload.order?.entity?.id,
    paymentId: event.payload.payment?.entity?.id,
  });

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  try {
    switch (event.event) {
      case 'payment.captured':
      case 'order.paid': {
        const payment = event.payload.payment?.entity;
        const order = event.payload.order?.entity;
        const orderId = payment?.order_id ?? order?.id;
        if (!orderId) {
          paymentWarn('webhook', 'missing_order_id', { event: event.event });
          break;
        }

        const { data: row } = await supabase
          .from('payments')
          .select('id, status, payment_id')
          .eq('order_id', orderId)
          .maybeSingle();

        if (!row) {
          paymentWarn('webhook', 'unknown_order', { orderIdPrefix: orderId.slice(0, 8) });
          break;
        }

        if (row.status === 'paid') {
          paymentLog('webhook', 'already_paid_skip', { orderIdPrefix: orderId.slice(0, 8) });
          break;
        }

        const paymentId = payment?.id ?? row.payment_id;
        const { error } = await supabase
          .from('payments')
          .update({
            status: 'paid',
            payment_id: paymentId,
            updated_at: now,
          })
          .eq('order_id', orderId)
          .eq('status', 'created');

        if (error) throw new Error(error.message);

        paymentLog('webhook', 'payment_history_updated', {
          orderIdPrefix: orderId.slice(0, 8),
          paymentIdPrefix: paymentId?.slice(0, 8),
        });
        break;
      }
      case 'payment.failed': {
        const payment = event.payload.payment?.entity;
        if (!payment?.order_id) break;

        const { error } = await supabase
          .from('payments')
          .update({ status: 'failed', updated_at: now })
          .eq('order_id', payment.order_id)
          .in('status', ['created']);

        if (error) throw new Error(error.message);

        paymentLog('webhook', 'payment_failed', {
          orderIdPrefix: payment.order_id.slice(0, 8),
          paymentIdPrefix: payment.id?.slice(0, 8),
        });
        break;
      }
      default:
        paymentLog('webhook', 'ignored_event', { event: event.event, eventId });
        break;
    }
  } catch (err) {
    paymentError('webhook', 'processing_failed', {
      event: event.event,
      eventId,
      error: err instanceof Error ? err.message : 'unknown',
    });
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
