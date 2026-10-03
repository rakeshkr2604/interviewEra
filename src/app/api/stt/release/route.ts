import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabase, createServiceClient } from '@/lib/supabase/server';
import { releaseSessionLease } from '@/lib/quota/stt-session-lease';
import { logSTTSession } from '@/lib/telemetry/voice-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      interview_id?: string;
      session_lease_id?: string;
      duration_seconds?: number;
      success?: boolean;
      error_category?: string;
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

    // Ownership check before durable STT usage log (service role write).
    const service = createServiceClient();
    const { data: interview } = await service
      .from('interviews')
      .select('id, user_id')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (interview) {
      const success = body.success !== false;
      const sttDurationMs = typeof duration === 'number' ? duration * 1000 : 0;
      void logSTTSession({
        user_id: user.id,
        interview_id: interviewId,
        stt_duration_ms: sttDurationMs,
        stt_model: 'nova-3',
        success,
        error_category: success ? undefined : (body.error_category ?? 'session_error'),
        session_id: leaseId.slice(0, 64),
      });
    }

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
