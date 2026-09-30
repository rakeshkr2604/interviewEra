/**
 * Durable milestone/lifecycle event persistence — best-effort.
 * Uses service-role Supabase client directly (no next/headers dependency).
 * No `server-only` guard, matching `product-events-store.ts`: this is the
 * low-level insert primitive, unit-tested directly; callers that compose it
 * into a route/server action carry the `server-only` guard instead.
 *
 * - `persistMilestoneEventOnce` — fire-and-forget (request paths).
 * - `persistMilestoneEventOnceAsync` — awaited (cron / batch paths that want
 *   to shrink the crash window without rolling back business mutations).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ProductEventName } from '@/lib/analytics/product-events';
import { isSupabasePlaceholderCredential } from '@/lib/analytics/product-events-store';
import { scheduleServerlessBackgroundWork } from '@/lib/analytics/schedule-serverless-background-work';

/** Postgres unique_violation — the dedupe partial indexes in migration 052. */
const UNIQUE_VIOLATION = '23505';

const MAX_STRING_LEN = 500;

export type MilestoneEventName = Extract<
  ProductEventName,
  | 'interview_session_opened'
  | 'interview_first_question_played'
  | 'interview_mic_blocked'
  | 'interview_first_answer_blocked'
  | 'interview_started'
  | 'interview_completed'
  | 'interview_abandoned'
>;

export type PersistMilestoneResult =
  | { ok: true; alreadyRecorded?: boolean }
  | { ok: false; error: string; skipped?: boolean };

let cachedServiceClient: SupabaseClient | null | undefined;

export function resetMilestoneEventServiceClientCacheForTests(): void {
  cachedServiceClient = undefined;
}

function getServiceClient(): SupabaseClient | null {
  if (cachedServiceClient !== undefined) {
    return cachedServiceClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key || isSupabasePlaceholderCredential(url, key)) {
    cachedServiceClient = null;
    return null;
  }

  cachedServiceClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return cachedServiceClient;
}

function sanitizeProps(
  props: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    out[key] = typeof value === 'string' ? value.slice(0, MAX_STRING_LEN) : value;
  }
  return out;
}

/**
 * Awaitable insert for at-most-one milestone/lifecycle events (migration 052).
 * Never throws — returns { ok: false } on persistence failure so callers can
 * keep business outcomes successful.
 */
export async function persistMilestoneEventOnceAsync(
  eventName: MilestoneEventName,
  props: Record<string, string | number | boolean | undefined>,
): Promise<PersistMilestoneResult> {
  const userId = typeof props.user_id === 'string' ? props.user_id : null;
  const { user_id: _uid, ...rest } = props;
  const cleanProps = sanitizeProps(rest);

  try {
    const svc = getServiceClient();
    if (!svc) {
      return { ok: false, error: 'service_client_unavailable', skipped: true };
    }
    const { error } = await svc.from('product_events').insert({
      event_name: eventName,
      user_id: userId,
      props: cleanProps,
    });
    if (!error) return { ok: true };
    if (error.code === UNIQUE_VIOLATION) {
      return { ok: true, alreadyRecorded: true };
    }
    console.warn('[milestone-events-store] insert failed:', error.message);
    return { ok: false, error: error.message };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('[milestone-events-store] persist error:', message);
    return { ok: false, error: message };
  }
}

/**
 * Fire-and-forget wrapper — schedules `persistMilestoneEventOnceAsync`.
 * Must never throw into the caller's request path.
 */
export function persistMilestoneEventOnce(
  eventName: MilestoneEventName,
  props: Record<string, string | number | boolean | undefined>,
): void {
  scheduleServerlessBackgroundWork(async () => {
    await persistMilestoneEventOnceAsync(eventName, props);
  });
}
