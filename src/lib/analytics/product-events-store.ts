/**
 * Durable product-event persistence — best-effort, non-blocking.
 * Uses service-role Supabase client directly (no next/headers dependency).
 */

import { createClient } from '@supabase/supabase-js';
import type { ProductEventName } from '@/lib/analytics/product-events';
import { isPlaceholderValue } from '@/lib/redis/client';

const MAX_PROP_KEYS = 32;
const MAX_STRING_LEN = 500;

export function isSupabasePlaceholderCredential(url?: string, key?: string): boolean {
  if (!url || !key) return true;
  if (isPlaceholderValue(url) || isPlaceholderValue(key)) return true;

  try {
    const parts = key.trim().split('.');
    if (parts.length === 3) {
      let b64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4 !== 0) {
        b64 += '=';
      }
      const payloadJson = Buffer.from(b64, 'base64').toString('utf-8');
      const payload = JSON.parse(payloadJson) as Record<string, unknown>;

      if (payload.iss === 'supabase-demo') {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key || isSupabasePlaceholderCredential(url, key)) return null;
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

function formatErrorMessage(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.length > 0) {
      return obj.message;
    }
  }
  if (typeof err === 'string' && err.length > 0) {
    return err;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return String(err);
}

export function isNonRetryableError(error: unknown): boolean {
  if (!error) return false;

  let message = '';
  let code = '';
  let status: number | undefined = undefined;

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    if (typeof errObj.message === 'string') message = errObj.message;
    if (typeof errObj.code === 'string') code = errObj.code;
    if (typeof errObj.status === 'number') status = errObj.status;
    if (typeof errObj.code === 'number') {
      const parsed = Number(errObj.code);
      if (!Number.isNaN(parsed)) status = parsed;
    }
  } else if (typeof error === 'string') {
    message = error;
  }

  if (status === 401 || status === 403) return true;

  if (code === '42501' || code === '42P01' || code === 'PGRST301' || code === '401' || code === '403') {
    return true;
  }

  const lowerMsg = message.toLowerCase();
  if (
    lowerMsg.includes('invalid api key') ||
    lowerMsg.includes('invalid credentials') ||
    lowerMsg.includes('invalid claim') ||
    lowerMsg.includes('jwt expired') ||
    lowerMsg.includes('invalid jwt') ||
    lowerMsg.includes('jwt claim') ||
    lowerMsg.includes('unauthorized') ||
    lowerMsg.includes('permission denied') ||
    lowerMsg.includes('authentication failed') ||
    lowerMsg.includes('authentication failure')
  ) {
    return true;
  }

  return false;
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
    const svc = getServiceClient();
    if (!svc) return;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { error } = await svc.from('product_events').insert({
          event_name: eventName,
          user_id: userId,
          props: cleanProps,
        });
        if (!error) return; // success

        const msg = formatErrorMessage(error);
        if (isNonRetryableError(error)) {
          console.warn('[product-events-store] insert failed:', msg);
          return;
        }

        if (attempt === 0) {
          console.warn('[product-events-store] insert failed (will retry):', msg);
          await new Promise((r) => setTimeout(r, 1000));
        } else {
          console.warn('[product-events-store] insert failed after retry:', msg);
        }
      } catch (err) {
        const msg = formatErrorMessage(err);
        if (isNonRetryableError(err)) {
          console.warn('[product-events-store] persist error:', msg);
          return;
        }

        if (attempt === 0) {
          console.warn('[product-events-store] persist error (will retry):', msg);
          await new Promise((r) => setTimeout(r, 1000));
        } else {
          console.warn('[product-events-store] persist error after retry:', msg);
        }
      }
    }
  })();
}
