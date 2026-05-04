import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import type { ParsedResume } from '@/types/app.types';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const resumeId = searchParams.get('id');

    if (!resumeId) {
      return NextResponse.json({ error: 'Missing resume id' }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const { data: resume, error: resumeError } = await serviceClient
      .from('resumes')
      .select('id, status, parsed_data')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (resumeError) {
      console.error('[resume/status] DB query error:', resumeError);
      return NextResponse.json({ error: 'Failed to fetch resume status' }, { status: 500 });
    }

    if (!resume) {
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    const payload: {
      resumeId: string;
      status: string;
      ready: boolean;
      parsed_data?: ParsedResume;
    } = {
      resumeId: resume.id,
      status: resume.status,
      ready: resume.status === 'parsed',
    };

    if (resume.status === 'parsed' && resume.parsed_data) {
      payload.parsed_data = resume.parsed_data as ParsedResume;
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error('[resume/status] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
