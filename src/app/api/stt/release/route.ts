import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase } from '@/lib/supabase/server';
import { releaseSessionLease } from '@/lib/quota/stt-session-lease';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      interview_id?: string;
      session_lease_id?: string;
      duration_seconds?: number;
    };

    const interviewId = body.interview_id?.trim();
    const leaseId = body.session_lease_id?.trim();
    if (!interviewId || !leaseId) {
      return NextResponse.json({ error: 'interview_id and session_lease_id are required' }, { status: 400 });
    }

    const supabase = await createSupabase();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const duration =
      typeof body.duration_seconds === 'number' && Number.isFinite(body.duration_seconds)
        ? Math.max(0, Math.min(7200, Math.ceil(body.duration_seconds)))
        : undefined;

    await releaseSessionLease(user.id, leaseId, duration);

    console.info('[DEEPGRAM]', JSON.stringify({
      event: 'voice_session_released',
      interview_id: interviewId,
      user_id: user.id,
      session_lease_id: leaseId,
      duration_seconds: duration ?? null,
      ts: new Date().toISOString(),
    }));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[stt/release] unexpected', err);
    return NextResponse.json({ error: 'Release failed' }, { status: 500 });
  }
}
