import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWelcomeEmailIfNeeded } from '@/lib/email/lifecycle/send-welcome';

export async function POST(): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await sendWelcomeEmailIfNeeded(user.id);

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    skipped: result.skipped,
  });
}
