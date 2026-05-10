import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { isDebugRoutesEnabled, isUploadDiagnosticsEnabled } from '@/lib/debug/upload-diagnostics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Raw storage.list on `resumes` bucket (service role). Requires IE_DEBUG_ROUTES=1 + login. */
export async function GET(): Promise<NextResponse> {
  if (!isDebugRoutesEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const client = createServiceClient();
    const { data, error } = await client.storage.from('resumes').list('', { limit: 5 });

    return NextResponse.json({
      ok: !error,
      userIdPrefix: user.id.slice(0, 8),
      listError: error
        ? { message: error.message, name: (error as { name?: string }).name }
        : null,
      listDataSample: data ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        thrown: e instanceof Error ? e.message : String(e),
        ...(isUploadDiagnosticsEnabled() && e instanceof Error ? { stack: e.stack } : {}),
      },
      { status: 500 },
    );
  }
}
