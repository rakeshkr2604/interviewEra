'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  readResolvedInterviewSetupPreferences,
  type ResolvedInterviewSetupPreferences,
} from '@/lib/interview/resolved-interview-setup-preferences'

/**
 * Re-reads when the tab becomes visible again (e.g. user tweaked Settings, then returns).
 * Cross-tab updates: `storage` event for `ie-*` keys.
 */
export function useResolvedInterviewSetupPreferences(): {
  resolved: ResolvedInterviewSetupPreferences
  refresh: () => void
} {
  const [resolved, setResolved] = useState<ResolvedInterviewSetupPreferences>(() =>
    readResolvedInterviewSetupPreferences(),
  )

  const refresh = useCallback(() => {
    setResolved(readResolvedInterviewSetupPreferences())
  }, [])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith('ie-')) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refresh])

  return { resolved, refresh }
}
