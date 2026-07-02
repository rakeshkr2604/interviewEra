/**
 * Durable product-event persistence — best-effort, non-blocking.
 * Uses service-role Supabase client directly (no next/headers dependency).
 */

import { createClient } from '@supabase/supabase-js';
import type { ProductEventName } from '@/lib/analytics/product-events';

const MAX_PROP_KEYS = 32;
const MAX_STRING_LEN = 500;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function sanitizeProps(
  props: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  let count = 0;
  for (const [key, value] of Object.entries(props)) {
    if (count >= MAX_PROP_KEYS) break;
    if (value === undefined) continue;
    if (typeof value === 'string') {
      out[key] = value.slice(0, MAX_STRING_LEN);
    } else {
      out[key] = value;
    }
    count += 1;
  }
  return out;
}

/** Fire-and-forget insert; never throws to callers. */
export function persistProductEventAsync(
  eventName: ProductEventName,
  props: Record<string, string | number | boolean | undefined> = {},
): void {
  const userId =
    typeof props.user_id === 'string'
      ? props.user_id
      : typeof props.userId === 'string'
        ? props.userId
        : null;

  const { user_id: _uid, userId: _legacy, event_name: _en, event: _e, ...rest } = props;
  const cleanProps = sanitizeProps(rest);

  void (async () => {
    try {
      const svc = getServiceClient();
      if (!svc) return;
      const { error } = await svc.from('product_events').insert({
        event_name: eventName,
        user_id: userId,
        props: cleanProps,
      });
      if (error) {
        console.warn('[product-events-store] insert failed:', error.message);
      }
    } catch (err) {
      console.warn(
        '[product-events-store] persist error:',
        err instanceof Error ? err.message : String(err),
      );
    }
  })();
}
