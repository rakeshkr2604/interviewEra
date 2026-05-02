import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSubscriptionOrder } from '@/lib/razorpay/client';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { paymentCreateOrderSchema } from '@/lib/validations/schemas';
import type { PlanTier } from '@/types/app.types';

const TIER_ORDER: Record<PlanTier, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  campus: 3,
  campus_admin: 3,
};

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting (5 orders / 60s per user)
  const rateLimit = await checkRateLimit(`payment:${user.id}`, 60, 5);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before trying again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.resetInSeconds),
          'X-RateLimit-Remaining': '0',
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const validation = paymentCreateOrderSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0].message },
      { status: 400 },
    );
  }

  const { plan, billingCycle } = validation.data;

  // Campus requires direct enrollment — not available via self-serve checkout
  if (plan === 'campus') {
    return NextResponse.json(
      { error: 'Campus plan requires direct enrollment. Contact us at campus@interviewera.com' },
      { status: 400 },
    );
  }

  // Check for existing active subscription
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id, status, plan')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    const existingTier = TIER_ORDER[(existing.plan as PlanTier) ?? 'free'];
    const newTier = TIER_ORDER[plan as PlanTier] ?? 0;
    // Block same-plan or downgrade; allow upgrade to higher tier
    if (existingTier >= newTier) {
      return NextResponse.json(
        { error: 'You already have an active subscription for this plan or a higher plan.' },
        { status: 409 },
      );
    }
  }

  try {
    const order = await createSubscriptionOrder(user.id, plan, billingCycle as 'monthly' | 'annual');
    return NextResponse.json(order);
  } catch (err) {
    console.error('[create-order] Razorpay error:', err);
    return NextResponse.json(
      { error: 'Failed to create subscription order. Please try again.' },
      { status: 500 },
    );
  }
}
