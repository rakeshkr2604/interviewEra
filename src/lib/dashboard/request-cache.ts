import { cache } from 'react'
import {
  fetchDashboardUserRow,
  loadCandidateSnapshot,
} from '@/lib/candidate/load-snapshot'
import { createClient } from '@/lib/supabase/server'
import { PostgrestError } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

import { timedDashboardSpan } from '@/lib/dashboard/perf-trace'
import { isAuthInfrastructureError } from '@/lib/supabase/session'
import { SupabaseTimeoutError, withSupabaseTimeout } from '@/lib/supabase/with-timeout'

/** One Supabase server client per RSC request (layout + page share it). */
export const getCachedSupabase = cache(async () => createClient())

/** Shared error shape for a timed-out read below — a real PostgrestError so `.error` checks work unchanged. */
function timeoutAsPostgrestError(err: SupabaseTimeoutError): PostgrestError {
  return new PostgrestError({
    message: err.message,
    details: '',
    hint: '',
    code: 'supabase_call_timeout',
  })
}

/** Dedupes `auth.getUser()` across dashboard layout and page in the same request. */
export const getCachedAuthUser = cache(async (): Promise<User | null> => {
  return timedDashboardSpan('auth.getUser', async () => {
    const supabase = await getCachedSupabase()
    try {
      const {
        data: { user },
        error,
      } = await withSupabaseTimeout('getCachedAuthUser', () => supabase.auth.getUser())
      if (error) {
        if (isAuthInfrastructureError(error)) {
          throw error
        }
        return null
      }
      return user ?? null
    } catch (err) {
      if (isAuthInfrastructureError(err)) {
        throw err
      }
      return null
    }
  })
})

/**
 * Full dashboard `users` row — shared by layout (plan_tier) and /dashboard page.
 * On timeout, resolves to an error-shaped result (not a rejection) — callers
 * already branch on `.error`/`.data` for a real Postgres error, so a bounded
 * wait degrades through that same existing path instead of a new one.
 */
export const getCachedDashboardUserRow = cache(async (userId: string) => {
  const supabase = await getCachedSupabase()
  try {
    return await withSupabaseTimeout('getCachedDashboardUserRow', () =>
      fetchDashboardUserRow(supabase, userId),
    )
  } catch (err) {
    if (err instanceof SupabaseTimeoutError) {
      return { data: null, error: timeoutAsPostgrestError(err) }
    }
    throw err
  }
})

/** Full `user_progress` row — shared by layout (current_streak) and /dashboard page. */
export const getCachedUserProgressRow = cache(async (userId: string) => {
  const supabase = await getCachedSupabase()
  try {
    return await withSupabaseTimeout('getCachedUserProgressRow', () =>
      supabase.from('user_progress').select('*').eq('user_id', userId).maybeSingle(),
    )
  } catch (err) {
    if (err instanceof SupabaseTimeoutError) {
      return { data: null, error: timeoutAsPostgrestError(err) }
    }
    throw err
  }
})

/** One candidate snapshot per RSC request — notifications / readiness / roadmap share it. */
export const getCachedCandidateSnapshot = cache(async (userId: string) => {
  const supabase = await getCachedSupabase()
  return withSupabaseTimeout(
    'getCachedCandidateSnapshot',
    () => loadCandidateSnapshot(userId, { client: supabase }),
    15_000,
  )
})
