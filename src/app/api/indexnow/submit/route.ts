import { NextResponse, type NextRequest } from 'next/server';
import { submitToIndexNow } from '@/lib/seo/indexnow';
import { buildAllIndexableUrls } from '@/lib/seo/sitemap/registry';

/**
 * Programmatic IndexNow trigger — call after publishing/updating content, from a Vercel
 * Deploy Hook, a cron, or a CMS webhook.
 *
 *   POST /api/indexnow/submit
 *   Authorization: Bearer <INDEXNOW_SUBMIT_SECRET>
 *   { "urls": ["https://interviewera.com/blog/new-post"] }   // optional; omit = all sitemap URLs
 *
 * Auth: requires `INDEXNOW_SUBMIT_SECRET` (env). If the secret is unset, the route is
 * disabled (503) so it can never be abused before you configure it.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.INDEXNOW_SUBMIT_SECRET?.trim();
  if (!secret) return false;
  const header = req.headers.get('authorization') ?? '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const queryKey = req.nextUrl.searchParams.get('secret')?.trim() ?? '';
  return bearer === secret || queryKey === secret;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!process.env.INDEXNOW_SUBMIT_SECRET) {
    return NextResponse.json(
      { error: 'IndexNow submit endpoint is not configured (set INDEXNOW_SUBMIT_SECRET).' },
      { status: 503 },
    );
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let urls: string[] | undefined;
  try {
    const body = (await req.json().catch(() => null)) as { urls?: unknown } | null;
    if (body && Array.isArray(body.urls)) {
      urls = body.urls.filter((u): u is string => typeof u === 'string');
    }
  } catch {
    /* empty/invalid body → fall back to full sitemap */
  }

  const target = urls && urls.length > 0 ? urls : buildAllIndexableUrls(new Date());
  const result = await submitToIndexNow(target);

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
