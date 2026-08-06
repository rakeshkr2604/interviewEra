/**
 * Durable client CTA click persistence — mirrors page-view beacon.
 * GA4 alone is not enough for founder dashboards (docs/SEO.md).
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { trackProductEventServer } from '@/lib/analytics/product-events-server';
import { checkRateLimit } from '@/lib/redis/rate-limit';
import { CTA_KEYS, type CtaKey } from '@/lib/analytics/cta-keys';
import { normalizePagePath } from '@/lib/analytics/page-view';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_CONTENT = new NextResponse(null, { status: 204 });
const ALLOWED_CTA_KEYS = new Set<string>(Object.values(CTA_KEYS));

function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function isCtaKey(value: unknown): value is CtaKey {
  return typeof value === 'string' && ALLOWED_CTA_KEYS.has(value);
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
    if (!isCtaKey(record.cta_key)) return NO_CONTENT;

    try {
      const rl = await checkRateLimit(`cta-click:${clientIp(request)}`, 60, 120);
      if (!rl.allowed) return NO_CONTENT;
    } catch {
      /* fail open */
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const page =
      typeof record.page === 'string' ? normalizePagePath(record.page) : '/';
    const section =
      typeof record.section === 'string' ? record.section.slice(0, 80) : 'unknown';
    const ctaText =
      typeof record.cta_text === 'string' ? record.cta_text.slice(0, 120) : '';

    trackProductEventServer({
      event_name: 'landing_cta_clicked',
      ...(user?.id ? { user_id: user.id } : {}),
      cta_key: record.cta_key,
      cta_text: ctaText,
      page,
      section,
      authenticated: Boolean(user),
      source: 'client_cta',
    });

    return NO_CONTENT;
  } catch {
    return NO_CONTENT;
  }
}
