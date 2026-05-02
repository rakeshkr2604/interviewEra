import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { aggregateReport } from '@/lib/utils/report';
import { interviewCompleteSchema } from '@/lib/validations/schemas';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // ── Authenticate + verify ownership ───────────────────────────────────────
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

    const validation = interviewCompleteSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { interviewId } = validation.data;

    const serviceClient = createServiceClient();

    const { data: interview } = await serviceClient
      .from('interviews')
      .select('id, user_id, status')
      .eq('id', interviewId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // Idempotent: if already completed, return the existing report
    if (interview.status === 'completed') {
      const { data: existingReport } = await serviceClient
        .from('reports')
        .select('id')
        .eq('interview_id', interviewId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingReport) {
        return NextResponse.json({ reportId: existingReport.id });
      }
    }

    // ── Mark interview completed ───────────────────────────────────────────────
    await serviceClient
      .from('interviews')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', interviewId);

    // ── Generate report ────────────────────────────────────────────────────────
    const { reportId } = await aggregateReport(interviewId, user.id);

    return NextResponse.json({ reportId });
  } catch (err) {
    console.error('[interview/complete] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
