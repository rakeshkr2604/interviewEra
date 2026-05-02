import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyWebhookSignature, PLAN_ACTIVATION_CREDITS } from '@/lib/razorpay/client';

// Razorpay webhook payload shapes (minimal — only fields we use)
interface RazorpaySubscriptionEntity {
  id: string;
  plan_id: string;
  notes: Record<string, string>;
  current_end?: number;
  current_start?: number;
}

interface RazorpayPaymentEntity {
  id: string;
  amount: number;
  subscription_id?: string;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: { entity: RazorpaySubscriptionEntity };
    payment?: { entity: RazorpayPaymentEntity };
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  // Always return 200 to Razorpay quickly; processing is synchronous but fast
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn('[webhook] Invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: RazorpayWebhookPayload;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.event) {
      case 'subscription.activated':
        await handleActivated(supabase, event);
        break;
      case 'subscription.charged':
        await handleCharged(supabase, event);
        break;
      case 'subscription.cancelled':
        await handleCancelled(supabase, event);
        break;
      case 'payment.failed':
        console.error('[webhook] Payment failed:', event.payload.payment?.entity?.id);
        break;
      default:
        // Ignore other events
        break;
    }
  } catch (err) {
    console.error(`[webhook] Error processing ${event.event}:`, err);
    // Still return 200 — Razorpay will retry on non-2xx
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

function resolvePlanKey(plan: string, billingCycle: string): string {
  return billingCycle === 'annual' ? `${plan}_annual` : plan;
}

async function handleActivated(
  supabase: ReturnType<typeof createServiceClient>,
  event: RazorpayWebhookPayload,
): Promise<void> {
  const sub = event.payload.subscription?.entity;
  if (!sub) return;

  const userId = sub.notes['user_id'];
  const plan = sub.notes['plan'] as 'starter' | 'pro';
  const billingCycle = (sub.notes['billing_cycle'] as string | undefined) ?? 'monthly';
  if (!userId || !plan) return;

  const planKey = resolvePlanKey(plan, billingCycle);
  const credits = PLAN_ACTIVATION_CREDITS[planKey] ?? 0;
  const now = new Date().toISOString();
  const periodEnd = sub.current_end
    ? new Date(sub.current_end * 1000).toISOString()
    : null;
  const periodStart = sub.current_start
    ? new Date(sub.current_start * 1000).toISOString()
    : null;

  // Idempotency: skip if already activated for this subscription
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('razorpay_sub_id', sub.id)
    .maybeSingle();

  if (existingSub) return;

  // Upsert subscription record
  await supabase.from('subscriptions').insert({
    user_id: userId,
    plan,
    razorpay_sub_id: sub.id,
    status: 'active',
    current_period_start: periodStart,
    current_period_end: periodEnd,
  });

  // Update user plan_tier and credits (plan_tier is always 'starter' or 'pro', not 'starter_annual')
  await supabase
    .from('users')
    .update({ plan_tier: plan, credits_remaining: credits })
    .eq('id', userId);

  // Log credit transaction
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    type: 'credit',
    amount: credits,
    reason: `Subscription activated: ${sub.id}`,
    created_at: now,
  });
}

async function handleCharged(
  supabase: ReturnType<typeof createServiceClient>,
  event: RazorpayWebhookPayload,
): Promise<void> {
  const sub = event.payload.subscription?.entity;
  const payment = event.payload.payment?.entity;
  if (!sub || !payment) return;

  const userId = sub.notes['user_id'];
  const plan = sub.notes['plan'] as 'starter' | 'pro';
  const billingCycle = (sub.notes['billing_cycle'] as string | undefined) ?? 'monthly';
  if (!userId || !plan) return;

  const planKey = resolvePlanKey(plan, billingCycle);
  const credits = PLAN_ACTIVATION_CREDITS[planKey] ?? 0;

  // Idempotency: skip if already processed this payment
  const { data: existing } = await supabase
    .from('credit_transactions')
    .select('id')
    .eq('reason', `Monthly charge: ${payment.id}`)
    .maybeSingle();

  if (existing) return;

  // Top up credits (set to plan allocation — no indefinite stacking)
  await supabase
    .from('users')
    .update({ credits_remaining: credits })
    .eq('id', userId);

  // Update subscription period dates
  const periodEnd = sub.current_end
    ? new Date(sub.current_end * 1000).toISOString()
    : null;
  const periodStart = sub.current_start
    ? new Date(sub.current_start * 1000).toISOString()
    : null;

  await supabase
    .from('subscriptions')
    .update({ current_period_start: periodStart, current_period_end: periodEnd })
    .eq('razorpay_sub_id', sub.id);

  // Log credit transaction
  await supabase.from('credit_transactions').insert({
    user_id: userId,
    type: 'credit',
    amount: credits,
    reason: `Monthly charge: ${payment.id}`,
    created_at: new Date().toISOString(),
  });
}

async function handleCancelled(
  supabase: ReturnType<typeof createServiceClient>,
  event: RazorpayWebhookPayload,
): Promise<void> {
  const sub = event.payload.subscription?.entity;
  if (!sub) return;

  // Mark as cancelled — user keeps access until current_period_end
  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('razorpay_sub_id', sub.id);
}
