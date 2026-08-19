import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { normalizePagePath } from '@/lib/analytics/page-view';
import { trackProductEventServer } from '@/lib/analytics/product-events-server';
import { checkRateLimit } from '@/lib/redis/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_CONTENT = new NextResponse(null, { status: 204 });
const PRODUCT_EVENT_TRACE_ENABLED = process.env.IE_DIAGNOSTICS_PRODUCT_EVENT_TRACE === '1';

function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = PRODUCT_EVENT_TRACE_ENABLED
    ? (request.headers.get('x-ie-correlation-id') ??
      request.headers.get('x-vercel-id') ??
      randomUUID().slice(0, 12))
    : null;
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

    const eventPayload: Parameters<typeof trackProductEventServer>[0] = {
      event_name: 'page_view',
      user_id: user?.id,
      page_path: path,
      source: 'client_navigation',
    };
    if (PRODUCT_EVENT_TRACE_ENABLED) {
      eventPayload.request_id = requestId ?? undefined;
      eventPayload.route = '/api/analytics/page-view';
    }
    trackProductEventServer(eventPayload);

    return NO_CONTENT;
  } catch {
    return NO_CONTENT;
  }
}
