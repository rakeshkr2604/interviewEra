import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { isUploadDiagnosticsEnabled } from '@/lib/debug/upload-diagnostics';
import { requireDebugAdminAccess } from '@/lib/debug/require-debug-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Raw storage.list on `resumes` bucket (service role). Requires IE_DEBUG_ROUTES=1 + platform admin. */
export async function GET(): Promise<NextResponse> {
  const gate = await requireDebugAdminAccess();
  if (gate.error) return gate.error;
  const admin = gate.admin;

  try {
    const client = createServiceClient();
    const { data, error } = await client.storage.from('resumes').list('', { limit: 5 });

    return NextResponse.json({
      ok: !error,
      userIdPrefix: admin.id.slice(0, 8),
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
