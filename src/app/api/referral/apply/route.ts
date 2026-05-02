import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { referralApplySchema } from '@/lib/validations/schemas';
import { addCredit } from '@/lib/utils/credits';

export async function POST(request: Request): Promise<NextResponse> {
  // Authenticate the referred user
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

  const { referralCode } = validation.data;
  const referredUserId = user.id;

  // Use service client for all DB operations — we need to read/write other users' data
  const serviceClient = createServiceClient();

  // Find referrer by referral_code
  // NOTE: users table requires a referral_code column — see DB migration notes
  const { data: referrer } = await serviceClient
    .from('users')
    .select('id')
    .eq('referral_code', referralCode)
    .maybeSingle();

  if (!referrer) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
  }

  if (referrer.id === referredUserId) {
    return NextResponse.json(
      { error: 'You cannot use your own referral code' },
      { status: 400 },
    );
  }

  // Check if this referred user has already received a referral bonus
  const { data: existingReferral } = await serviceClient
    .from('referrals')
    .select('id, status')
    .eq('referred_id', referredUserId)
    .eq('status', 'credited')
    .maybeSingle();

  if (existingReferral) {
    return NextResponse.json(
      { error: 'Referral bonus already applied' },
      { status: 409 },
    );
  }

  // Verify this is the referred user's first completed interview
  const { count: completedCount } = await serviceClient
    .from('interviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', referredUserId)
    .eq('status', 'completed');

  if (!completedCount || completedCount < 1) {
    return NextResponse.json(
      { error: 'Complete your first interview to unlock the referral bonus' },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  // Find or create the pending referral record
  const { data: pendingReferral } = await serviceClient
    .from('referrals')
    .select('id')
    .eq('referrer_id', referrer.id)
    .eq('referred_id', referredUserId)
    .eq('status', 'pending')
    .maybeSingle();

  if (pendingReferral) {
    await serviceClient
      .from('referrals')
      .update({ status: 'credited', credited_at: now })
      .eq('id', pendingReferral.id);
  } else {
    await serviceClient.from('referrals').insert({
      referrer_id: referrer.id,
      referred_id: referredUserId,
      status: 'credited',
      credited_at: now,
    });
  }

  // Award +1 credit to referred user via existing atomic utility
  await addCredit(referredUserId, 1, `Referral bonus — referred by ${referrer.id}`);

  // Award +1 credit to referrer via existing atomic utility
  await addCredit(referrer.id, 1, `Referral bonus — friend ${referredUserId} completed first interview`);

  return NextResponse.json({ credited: true });
}
