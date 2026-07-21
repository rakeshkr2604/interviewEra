import { cache } from 'react'
import { fetchDashboardUserRow } from '@/lib/candidate/load-snapshot'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/** One Supabase server client per RSC request (layout + page share it). */
export const getCachedSupabase = cache(async () => createClient())

/** Dedupes `auth.getUser()` across dashboard layout and page in the same request. */
export const getCachedAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await getCachedSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
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
