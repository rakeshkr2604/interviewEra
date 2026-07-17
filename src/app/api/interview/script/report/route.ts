import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { loadOrGenerateScriptReport } from '@/lib/interview/script-report/generate';

export const maxDuration = 60;

const querySchema = z.object({
  interviewId: z.string().uuid(),
  force: z
    .enum(['0', '1', 'true', 'false'])
    .optional()
    .transform((v) => v === '1' || v === 'true'),
});

/**
 * GET /api/interview/script/report?interviewId=…
 *
 * Loads a persisted v2.1 report, or generates + upserts on first view.
 * Ownership: authenticated user must own the interview.
 */
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

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      interviewId: url.searchParams.get('interviewId'),
      force: url.searchParams.get('force') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query', fieldErrors: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const serviceClient = createServiceClient();
    const result = await loadOrGenerateScriptReport({
      serviceClient,
      interviewId: parsed.data.interviewId,
      userId: user.id,
      forceRegenerate: parsed.data.force ?? false,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      { report: result.report, created: result.created },
      { status: 200 },
    );
  } catch (err) {
    console.error('[interview/script/report] unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
