import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  RESUME_FILE_NO_STORE_HEADERS,
  mintResumeSignedUrl,
} from '@/lib/resume/signed-file-url';

type RouteContext = { params: Promise<{ id: string }> };

function jsonNoStore(
  body: Record<string, unknown>,
  status: number,
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { ...RESUME_FILE_NO_STORE_HEADERS },
  });
}

/**
 * GET /api/resume/:id/file
 *
 * Authenticated file access (Phase 1 + 2.5): ownership-checked short-lived signed URL
 * minted from storage_path (canonical). Does not use or persist file_url.
 * Clients should use this endpoint instead of any durable public fileUrl.
 */
export async function GET(_request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { id: resumeId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonNoStore({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
    }

    const serviceClient = createServiceClient();
    const { data: resume, error: fetchError } = await serviceClient
      .from('resumes')
      .select('id, user_id, storage_path, deleted_at')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('[resume/file] fetch error:', fetchError.message);
      return jsonNoStore({ error: 'Failed to verify resume.', code: 'FETCH_FAILED' }, 500);
    }

    if (!resume || resume.deleted_at) {
      return jsonNoStore({ error: 'Resume not found.', code: 'NOT_FOUND' }, 404);
    }

    const storagePath =
      typeof resume.storage_path === 'string' ? resume.storage_path.trim() : '';
    if (!storagePath) {
      return jsonNoStore(
        {
          error: 'Resume file is not available via secure download.',
          code: 'MISSING_STORAGE_PATH',
        },
        404,
      );
    }

    const minted = await mintResumeSignedUrl(serviceClient, {
      storagePath,
      userId: user.id,
      resumeId: resume.id,
    });

    if (!minted.ok) {
      const status = minted.reason === 'ownership_mismatch' ? 403 : 500;
      return jsonNoStore(
        {
          error: minted.message,
          code: minted.reason.toUpperCase(),
        },
        status,
      );
    }

    return jsonNoStore(
      {
        resumeId: resume.id,
        url: minted.signedUrl,
        expiresInSeconds: minted.expiresInSeconds,
        expiresAt: minted.expiresAt,
        // Explicit: clients must re-call this endpoint after expiry; do not store url.
      },
      200,
    );
  } catch (err) {
    console.error('[resume/file] unexpected', err);
    return jsonNoStore({ error: 'Internal server error', code: 'INTERNAL' }, 500);
  }
}
