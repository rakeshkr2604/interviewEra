import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DURABLE_FUNNEL_PRODUCT_EVENT_NAMES } from '@/lib/analytics/funnel';
import { trackProductEventServer } from '@/lib/analytics/product-events-server';
import type { ProductEventName } from '@/lib/analytics/product-events';
import { checkRateLimit } from '@/lib/redis/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_CONTENT = new NextResponse(null, { status: 204 });
const ALLOWED = new Set<ProductEventName>(DURABLE_FUNNEL_PRODUCT_EVENT_NAMES);

function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function isAllowedEventName(value: unknown): value is ProductEventName {
  return typeof value === 'string' && ALLOWED.has(value as ProductEventName);
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const raw = await request.text();
    if (!raw || raw.length > 8192) return NO_CONTENT;

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return NO_CONTENT;
    }

    if (typeof body !== 'object' || body === null) return NO_CONTENT;

    const record = body as Record<string, unknown>;
    if (!isAllowedEventName(record.event_name)) return NO_CONTENT;

    try {
      const rl = await checkRateLimit(`funnel-event:${clientIp(request)}`, 60, 120);
      if (!rl.allowed) return NO_CONTENT;
    } catch {
      /* fail open */
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { event_name, user_id, userId, ...rest } = record;
    const resolvedUserId =
      (typeof user_id === 'string' && user_id) ||
      (typeof userId === 'string' && userId) ||
      user?.id;

    trackProductEventServer({
      event_name,
      ...(resolvedUserId ? { user_id: resolvedUserId } : {}),
      ...rest,
    });

    return NO_CONTENT;
  } catch {
    return NO_CONTENT;
  }
}
