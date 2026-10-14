/**
 * Free-tool usage logger — aggregate, anonymized counters ONLY.
 *
 * Writes to `tool_usage_events` (migration 20260720000001): count + cost +
 * timestamp + tool + mode. No user_id, no ip, no PII — this is the scoped
 * exception to the GA4-only telemetry convention for admin reporting.
 *
 * All writes are fire-and-forget (call `logToolUsage(...)` without awaiting)
 * and NEVER block or fail the tool's response path.
 */

import { createServiceClient } from '@/lib/supabase/server';

export type ToolUsageTool = 'ats' | 'question_generator' | 'star' | 'prompt_builder';
export type ToolUsageEvent = 'run' | 'cache_hit' | 'rate_limited' | 'error';

export interface ToolUsageEntry {
  tool: ToolUsageTool;
  /** QG mode or prompt-builder goal. Omit when the tool has no mode. */
  mode?: string;
  event: ToolUsageEvent;
  /** Pass when known at the call site; ai_call_logs remains the cost source of truth. */
  cost_usd?: number | null;
  /** Cookie-presence heuristic (see isSignedInFromHeaders) — not a verified session. */
  signed_in: boolean;
}

/**
 * Persist one usage event. Fire-and-forget: never throws, never blocks.
 */
export function logToolUsage(entry: ToolUsageEntry): void {
  void (async () => {
    try {
      const svc = createServiceClient();
      const { error } = await svc.from('tool_usage_events').insert({
        tool: entry.tool,
        mode: entry.mode ?? null,
        event: entry.event,
        cost_usd: entry.cost_usd ?? null,
        signed_in: entry.signed_in,
      });
      if (error) {
        console.warn('[tool-usage] Insert failed:', error.message);
      }
    } catch (err) {
      console.warn('[tool-usage] Unexpected error:', err);
    }
  })();
}

/**
 * Signed-in detection via Supabase auth cookie presence (founder decision D(d)).
 *
 * The @supabase/ssr client stores the session as `sb-<project-ref>-auth-token`
 * (possibly chunked as `.0`, `.1`, …) — the codebase's own convention treats any
 * `sb-` cookie as a Supabase session cookie (see createClient in supabase/server.ts,
 * which also honors the `x-ie-sb-cookies-stripped` middleware flag).
 *
 * Read-only heuristic: does NOT validate the token and never calls
 * `supabase.auth.getUser()` — zero latency cost on anonymous tool paths.
 */
export function isSignedInFromHeaders(headersList: Pick<Headers, 'get'>): boolean {
  if (headersList.get('x-ie-sb-cookies-stripped') === '1') return false;
  const cookieHeader = headersList.get('cookie');
  if (!cookieHeader) return false;
  return cookieHeader
    .split(';')
    .some((part) => /^sb-[^=]+-auth-token(\.\d+)?$/.test(part.trim().split('=')[0] ?? ''));
}
