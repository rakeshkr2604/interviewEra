import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { referralApplySchema } from '@/lib/validations/schemas';
import { applyReferralBonus } from '@/lib/referral/apply-referral';

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

  const validation = referralApplySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0].message },
      { status: 400 },
    );
  }

  const serviceClient = createServiceClient();
  const result = await applyReferralBonus(
    serviceClient,
    user.id,
    validation.data.referralCode,
  );

  if (!result.credited) {
    const status =
      result.reason === 'already_credited'
        ? 409
        : result.reason === 'invalid_code'
          ? 404
          : result.reason === 'self_referral'
            ? 400
            : 400;
    return NextResponse.json({ error: result.reason }, { status });
  }

  return NextResponse.json({ credited: true });
}
