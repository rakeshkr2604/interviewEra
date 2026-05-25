import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import {
  SCREENSHOT_BUCKET,
  isAllowedScreenshotMime,
  sanitizeStem,
  screenshotPath,
} from '@/lib/feedback/screenshot';

export const runtime = 'nodejs';

const requestSchema = z.object({
  filename: z.string().max(255).optional().default('screenshot'),
  contentType: z.string().max(120),
});

/**
 * Mints a short-lived signed upload URL for a feedback screenshot. The client
 * uploads the bytes directly to Supabase Storage with the returned token, so
 * image data never transits this serverless function. Auth is required, which
 * is what prevents anonymous upload abuse; the bucket config enforces the
 * type/size limits on the actual upload.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await checkRateLimit(`feedback-shot:${user.id}`, 600, 10);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many uploads. Please wait a few minutes and try again.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { filename, contentType } = parsed.data;
  if (!isAllowedScreenshotMime(contentType)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Use PNG, JPG, or WEBP.' },
      { status: 400 },
    );
  }

  // Path is built server-side from the verified user id — the client cannot
  // choose which folder it writes to.
  const path = screenshotPath(user.id, contentType, sanitizeStem(filename));

  const service = createServiceClient();
  const { data, error } = await service.storage
    .from(SCREENSHOT_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    console.error('[feedback/screenshot] createSignedUploadUrl failed:', error?.message);
    return NextResponse.json(
      { error: 'Could not start the upload. Please try again.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ path: data.path, token: data.token });
}
