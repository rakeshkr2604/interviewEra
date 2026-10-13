/**
 * Bounded completed-interview helpers.
 *
 * Lifetime counts use `count: 'exact'` + `head: true`.
 * Report hydration uses a recent window only — never load every historical id.
 */

export const RECENT_COMPLETED_INTERVIEW_WINDOW = 20

export async function fetchCompletedInterviewCount(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase builder variance
  client: any,
  userId: string,
): Promise<number> {
  const { count, error } = await client
    .from('interviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
  if (error) {
    console.error('[completed-interviews] count failed', error.message)
  }
  return typeof count === 'number' ? count : 0
}

export async function fetchRecentCompletedInterviewIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase builder variance
  client: any,
  userId: string,
  limit = RECENT_COMPLETED_INTERVIEW_WINDOW,
): Promise<string[]> {
  const { data, error } = await client
    .from('interviews')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('[completed-interviews] recent ids failed', error.message)
    return []
  }
  return ((data ?? []) as { id: string }[]).map((row) => row.id)
}
