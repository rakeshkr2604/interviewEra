import { cache } from 'react'
import { fetchDashboardUserRow } from '@/lib/candidate/load-snapshot'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

import { isAuthInfrastructureError } from '@/lib/supabase/session'

/** One Supabase server client per RSC request (layout + page share it). */
export const getCachedSupabase = cache(async () => createClient())

/** Dedupes `auth.getUser()` across dashboard layout and page in the same request. */
export const getCachedAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await getCachedSupabase()
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
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

/** Full dashboard `users` row — shared by layout (plan_tier) and /dashboard page. */
export const getCachedDashboardUserRow = cache(async (userId: string) => {
  const supabase = await getCachedSupabase()
  return fetchDashboardUserRow(supabase, userId)
})

/** Full `user_progress` row — shared by layout (current_streak) and /dashboard page. */
export const getCachedUserProgressRow = cache(async (userId: string) => {
  const supabase = await getCachedSupabase()
  return supabase.from('user_progress').select('*').eq('user_id', userId).maybeSingle()
})
