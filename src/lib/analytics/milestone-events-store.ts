/**
 * Durable milestone/lifecycle event persistence — best-effort, non-blocking.
 * Uses service-role Supabase client directly (no next/headers dependency).
 * No `server-only` guard, matching `product-events-store.ts`: this is the
 * low-level insert primitive, unit-tested directly; callers that compose it
 * into a route/server action carry the `server-only` guard instead.
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
 * Fire-and-forget insert for exactly-once milestone/lifecycle events.
 *
 * Dedup is enforced by the partial unique indexes in migration 052
 * (event_name, interview_id[, run_id]) — a 23505 here means "already
 * recorded", which is the expected/successful outcome for a repeat fire, not
 * a failure, so it is swallowed rather than logged as a warning. Any other
 * error is a real persistence failure and is logged (best-effort — this must
 * never throw into the caller's request path).
 */
export function persistMilestoneEventOnce(
  eventName: MilestoneEventName,
  props: Record<string, string | number | boolean | undefined>,
): void {
  const userId = typeof props.user_id === 'string' ? props.user_id : null;
  const { user_id: _uid, ...rest } = props;
  const cleanProps = sanitizeProps(rest);

  scheduleServerlessBackgroundWork(async () => {
    try {
      const svc = getServiceClient();
      if (!svc) return;
      const { error } = await svc.from('product_events').insert({
        event_name: eventName,
        user_id: userId,
        props: cleanProps,
      });
      if (error && error.code !== UNIQUE_VIOLATION) {
        console.warn('[milestone-events-store] insert failed:', error.message);
      }
    } catch (err) {
      console.warn(
        '[milestone-events-store] persist error:',
        err instanceof Error ? err.message : String(err),
      );
    }
  });
}
