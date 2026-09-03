import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  attributionToEventProps,
  resolveDurableEventAttribution,
} from '@/lib/analytics/attribution';
import { CLIENT_DURABLE_FUNNEL_PRODUCT_EVENT_NAMES } from '@/lib/analytics/funnel';
import { trackProductEventServer } from '@/lib/analytics/product-events-server';
import type { ProductEventName } from '@/lib/analytics/product-events';
import { checkRateLimit } from '@/lib/redis/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_CONTENT = new NextResponse(null, { status: 204 });
const ALLOWED = new Set<ProductEventName>(CLIENT_DURABLE_FUNNEL_PRODUCT_EVENT_NAMES);
const ATTRIBUTION_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

const EVENT_PROP_KEYS: Partial<Record<ProductEventName, readonly string[]>> = {
  signup_completed: ['source', 'method'],
  resume_uploaded: ['resume_id', 'source'],
  mock_interview_started: ['interview_id', 'source', 'role', 'plan'],
  interview_completed: [
    'interview_id',
    'source',
    'role',
    'plan',
    'score',
    'quality_met',
  ],
  plan_selected: [
    'plan',
    'source',
    'source_page',
    'campaign_code',
    'campaign_code_id',
  ],
  promotion_viewed: [
    'plan',
    'source',
    'source_page',
    'campaign_code',
    'campaign_code_id',
    'discount_paise',
    'final_amount_paise',
    'expires_at',
  ],
  coupon_entered: [
    'plan',
    'source',
    'source_page',
    'campaign_code',
    'coupon_attempt_id',
  ],
  payment_started: ['order_id', 'source'],
  pricing_page_viewed: ['source_page', 'authenticated'],
};

function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function isAllowedEventName(value: unknown): value is ProductEventName {
  return typeof value === 'string' && ALLOWED.has(value as ProductEventName);
}

function pickAllowedProps(
  eventName: ProductEventName,
  record: Record<string, unknown>,
): Record<string, string | number | boolean | undefined> {
  const keys = [...(EVENT_PROP_KEYS[eventName] ?? []), ...ATTRIBUTION_KEYS];
  return Object.fromEntries(
    keys.flatMap((key) => {
      const value = record[key];
      return typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
        ? [[key, value]]
        : [];
    }),
  );
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

    const event_name = record.event_name;
    let props = pickAllowedProps(event_name, record);
    const attribution = resolveDurableEventAttribution(request, record);
    props = { ...props, ...attributionToEventProps(attribution) };

    if (event_name === 'payment_started') {
      const orderId = typeof props.order_id === 'string' ? props.order_id : null;
      if (!user?.id || !orderId) return NO_CONTENT;

      const service = createServiceClient();
      const { data: payment } = await service
        .from('payments')
        .select('plan, amount, campaign_code_id')
        .eq('order_id', orderId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!payment) return NO_CONTENT;

      props = {
        ...props,
        plan: payment.plan as string,
        amount: Number(payment.amount),
        ...(payment.campaign_code_id
          ? { campaign_code_id: payment.campaign_code_id as string }
          : {}),
      };
    }

    trackProductEventServer({
      event_name,
      ...props,
      ...(user?.id ? { user_id: user.id } : {}),
    });

    return NO_CONTENT;
  } catch {
    return NO_CONTENT;
  }
}
