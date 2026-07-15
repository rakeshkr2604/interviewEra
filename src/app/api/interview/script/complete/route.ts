import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const completeSchema = z.object({
  interviewId: z.string().uuid(),
  performanceBucket: z.enum(['strong', 'average', 'low']),
});

export async function PATCH(request: Request): Promise<NextResponse> {
  let interviewIdForLog = 'unknown';
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

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = completeSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          fieldErrors: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { interviewId, performanceBucket } = validation.data;
    interviewIdForLog = interviewId;

    // Step 2 — ownership + not-already-completed
    const serviceClient = createServiceClient();
    const { data: ownership, error: ownershipError } = await serviceClient
      .from('interviews')
      .select('id, status')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .eq('engine', 'v2.1')
      .maybeSingle();

    if (ownershipError) {
      console.error(`[interview/script/complete] ownership query failed (interviewId=${interviewId}):`, ownershipError);
      return NextResponse.json({ error: 'Failed to load interview' }, { status: 500 });
    }
    if (!ownership) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }
    if (ownership.status === 'completed') {
      return NextResponse.json({ error: 'Interview already completed' }, { status: 400 });
    }

    // Step 3 — mark complete
    const { error: updateError } = await serviceClient
      .from('interviews')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        performance_bucket: performanceBucket,
      })
      .eq('id', interviewId);

    if (updateError) {
      console.error(`[interview/script/complete] update failed (interviewId=${interviewId}):`, updateError);
      return NextResponse.json({ error: 'Failed to complete interview' }, { status: 500 });
    }

    // Step 4 — done
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error(`[interview/script/complete] Unexpected error (interviewId=${interviewIdForLog}):`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
