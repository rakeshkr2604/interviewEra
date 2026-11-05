/**
 * Bounds a Supabase call so a slow/hung upstream response degrades fast
 * instead of consuming the platform's full serverless function budget.
 *
 * Root-caused from a 2026-10-31 incident: a ~12-minute Supabase slowdown
 * caused `/dashboard`, `/report/script/[id]` and `/api/activity/heartbeat`
 * to hang on unguarded `await supabase...` calls until Vercel's hard 300s
 * ceiling killed them (36 occurrences) — each one billed as ~300s of Fluid
 * Active CPU, which is what actually exhausted the plan's compute quota,
 * not real traffic. See `src/lib/supabase/middleware.ts` for the original
 * instance of this pattern (the proxy auth check, fixed first).
 *
 * This only bounds latency — it does not retry or cache. Callers decide
 * what "timed out" means for them (existing call sites already treat a
 * Supabase error as degrade-to-null/false/skip; a timeout should resolve
 * the same way, just sooner).
 */

export class SupabaseTimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`supabase_call_timeout: ${label} exceeded ${ms}ms`);
    this.name = 'SupabaseTimeoutError';
  }
}

/** Default bound for a plain DB point-read/write (select/upsert on an indexed key). */
export const SUPABASE_READ_TIMEOUT_MS = 8_000;

/**
 * `fn` returns `PromiseLike<T>` rather than `Promise<T>` — Supabase/PostgREST
 * query builders are thenable but not structurally full Promises (no
 * `.catch`/`.finally`), and `Promise.race` only needs `.then`.
 */
export async function withSupabaseTimeout<T>(
  label: string,
  fn: () => PromiseLike<T>,
  ms: number = SUPABASE_READ_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new SupabaseTimeoutError(label, ms)), ms);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
