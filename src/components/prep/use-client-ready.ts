'use client'

import { useSyncExternalStore } from 'react'

function subscribe(): () => void {
  return () => {}
}

function clientReady(): boolean {
  return true
}

function serverReady(): boolean {
  return false
}

/** True after hydration. Server HTML stays `false` so the first client render matches. */
export function useClientReady(): boolean {
  return useSyncExternalStore(subscribe, clientReady, serverReady)
}
