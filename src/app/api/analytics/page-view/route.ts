import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizePagePath } from '@/lib/analytics/page-view';
import { trackProductEventServer } from '@/lib/analytics/product-events-server';
import { checkRateLimit } from '@/lib/redis/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_CONTENT = new NextResponse(null, { status: 204 });

function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const raw = await request.text();
    if (!raw || raw.length > 4096) return NO_CONTENT;

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NO_CONTENT;
    }

    const path =
      typeof body === 'object' && body !== null && 'path' in body
        ? normalizePagePath(String((body as { path: unknown }).path ?? ''))
        : '/';

    try {
      const rl = await checkRateLimit(`page-view:${clientIp(request)}`, 60, 120);
      if (!rl.allowed) return NO_CONTENT;
    } catch {
      /* fail open */
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    trackProductEventServer({
      event_name: 'page_view',
      user_id: user?.id,
      page_path: path,
      source: 'client_navigation',
    });

    return NO_CONTENT;
  } catch {
    return NO_CONTENT;
  }
}
