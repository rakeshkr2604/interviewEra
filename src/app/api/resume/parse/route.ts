import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { parseResume } from '@/lib/openai/parse-resume';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as { resumeId?: string };
    const resumeId = body.resumeId;

    if (!resumeId) {
      return NextResponse.json({ error: 'Missing resumeId' }, { status: 400 });
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Fetch resume (verify ownership + get raw_text) ────────────────────────
    const { data: resume, error: fetchError } = await supabase
      .from('resumes')
      .select('id, raw_text, status, user_id')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    if (resume.status === 'parsed') {
      return NextResponse.json({ status: 'parsed' });
    }

    if (!resume.raw_text?.trim()) {
      await createServiceClient()
        .from('resumes')
        .update({ status: 'failed' })
        .eq('id', resumeId);
      return NextResponse.json(
        { error: 'Resume has no text to parse.' },
        { status: 422 }
      );
    }

    // ── AI parsing ────────────────────────────────────────────────────────────
    let parsedData: Awaited<ReturnType<typeof parseResume>>;
    try {
      parsedData = await parseResume(resume.raw_text);
    } catch (err) {
      console.error('[resume/parse] AI parsing failed:', err);
      await createServiceClient()
        .from('resumes')
        .update({ status: 'failed' })
        .eq('id', resumeId);
      return NextResponse.json(
        { error: 'Failed to parse resume. Please try again.' },
        { status: 422 }
      );
    }

    // ── Persist parsed data ───────────────────────────────────────────────────
    const { error: updateError } = await createServiceClient()
      .from('resumes')
      .update({ parsed_data: parsedData, status: 'parsed' })
      .eq('id', resumeId);

    if (updateError) {
      console.error('[resume/parse] DB update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save parsed data.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'parsed',
      parsedSummary: {
        name: parsedData.name,
        skills: parsedData.skills.slice(0, 10),
        targetRoles: parsedData.target_roles,
      },
    });
  } catch (err) {
    console.error('[resume/parse] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
