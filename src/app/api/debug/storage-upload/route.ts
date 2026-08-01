import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getMultipleFilesError } from '@/lib/http/form-data-single-file';
import { normalizedUploadContentType } from '@/lib/http/upload-limits';
import { isDebugRoutesEnabled } from '@/lib/debug/upload-diagnostics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_DEBUG_BYTES = 32 * 1024;

/**
 * Minimal path: multipart → small .txt only → Buffer → service storage upload.
 * No PDF parser. Requires IE_DEBUG_ROUTES=1 + login. Isolates storage/auth/env.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const reqId = randomUUID().slice(0, 8);

  if (!isDebugRoutesEnabled()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized', requestId: reqId }, { status: 401 });
  }

  console.log('[UPLOAD_STAGE] debug_storage_upload formData_start', { reqId });
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (e) {
    console.error('[UPLOAD_STAGE] debug_storage_upload formData_error', reqId, e);
    return NextResponse.json(
      {
        ok: false,
        stage: 'formData',
        error: e instanceof Error ? e.message : String(e),
        requestId: reqId,
      },
      { status: 500 },
    );
  }
  console.log('[UPLOAD_STAGE] debug_storage_upload formData_done', { reqId });

  const multiErr = getMultipleFilesError(formData, 'file');
  if (multiErr) {
    return NextResponse.json({ ok: false, error: multiErr, requestId: reqId }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'No file', requestId: reqId }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith('.txt')) {
    return NextResponse.json({ ok: false, error: 'Only .txt for debug route', requestId: reqId }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_DEBUG_BYTES) {
    return NextResponse.json({ ok: false, error: 'Empty or > 32KB', requestId: reqId }, { status: 400 });
  }

  let buf: Buffer;
  try {
    buf = Buffer.from(await file.arrayBuffer());
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        stage: 'buffer',
        error: e instanceof Error ? e.message : String(e),
        requestId: reqId,
      },
      { status: 500 },
    );
  }

  const path = `resumes/${user.id}/debug-${Date.now()}.txt`;
  const contentType = normalizedUploadContentType(file.type, '.txt');

  console.log('[UPLOAD_STAGE] debug_storage_upload storage_upload_start', { reqId, path, size: buf.length });

  try {
    const client = createServiceClient();
    const { data, error } = await client.storage.from('resumes').upload(path, buf, {
      contentType,
      upsert: true,
    });

    console.log('[UPLOAD_STAGE] debug_storage_upload storage_upload_result', {
      reqId,
      hasError: !!error,
      message: error?.message,
      data,
    });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          stage: 'storage_upload',
          error: error.message,
          details: error,
          requestId: reqId,
        },
        { status: 500 },
      );
    }

    // Debug-only: publicUrl is deprecated for product paths (use path + /file).
    const { data: pub } = client.storage.from('resumes').getPublicUrl(path);

    return NextResponse.json({
      ok: true,
      stage: 'storage_upload',
      path,
      /** @deprecated Prefer `path` + GET /api/resume/:id/file in product code. */
      publicUrl: pub.publicUrl,
      requestId: reqId,
    });
  } catch (e) {
    console.error('[UPLOAD_STAGE] debug_storage_upload thrown', reqId, e);
    return NextResponse.json(
      {
        ok: false,
        stage: 'storage_upload',
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
        requestId: reqId,
      },
      { status: 500 },
    );
  }
}
