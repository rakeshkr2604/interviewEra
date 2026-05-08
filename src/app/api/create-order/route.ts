import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createStandardOrder } from '@/lib/razorpay/client';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { standardOrderCreateSchema } from '@/lib/validations/schemas';

export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(`payment:standard:${user.id}`, 60, 5);
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

  const validation = standardOrderCreateSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }

  const { amount, currency, receipt } = validation.data;

  const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!publicKey) {
    console.error('[create-order] NEXT_PUBLIC_RAZORPAY_KEY_ID is not set');
    return NextResponse.json(
      { error: 'Payment configuration error. Please try again later.' },
      { status: 500 },
    );
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('[create-order] Razorpay server credentials are not set');
    return NextResponse.json(
      { error: 'Payment configuration error. Please try again later.' },
      { status: 500 },
    );
  }

  try {
    const order = await createStandardOrder({
      amount,
      currency,
      receipt,
      userId: user.id,
    });
    return NextResponse.json({
      ...order,
      key: publicKey,
    });
  } catch (err) {
    console.error('[create-order] Razorpay error:', err);
    return NextResponse.json(
      { error: 'Failed to create order. Please try again.' },
      { status: 500 },
    );
  }
}
