import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Step 1 — auth
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get('id');
    if (!interviewId) {
      return NextResponse.json({ error: 'Missing interview id' }, { status: 400 });
    }

    // Step 2 — ownership-scoped, v2.1-only fetch
    const serviceClient = createServiceClient();
    const { data: interview, error: interviewError } = await serviceClient
      .from('interviews')
      .select('*')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .eq('engine', 'v2.1')
      .maybeSingle();

    if (interviewError) {
      console.error(`[interview/script/session] query failed (interviewId=${interviewId}):`, interviewError);
      return NextResponse.json({ error: 'Failed to load interview' }, { status: 500 });
    }
    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // Step 3 — return the full row
    return NextResponse.json(interview, { status: 200 });
  } catch (err) {
    console.error('[interview/script/session] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
