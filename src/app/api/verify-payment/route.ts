import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyStandardPaymentSignature } from '@/lib/razorpay/client';
import { standardPaymentVerifySchema } from '@/lib/validations/schemas';

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

  const validation = standardPaymentVerifySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { ok: false, error: validation.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 },
    );
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = validation.data;

  if (!process.env.RAZORPAY_KEY_SECRET) {
    console.error('[verify-payment] RAZORPAY_KEY_SECRET is not set');
    return NextResponse.json(
      { ok: false, error: 'Payment configuration error.' },
      { status: 500 },
    );
  }

  const valid = verifyStandardPaymentSignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  );

  if (!valid) {
    return NextResponse.json({ ok: false, error: 'Invalid signature' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
