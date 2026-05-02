'use client'
import { useEffect, useState } from 'react'

export function useOffline(): boolean {
  const [isOffline, setIsOffline] = useState(
    () => typeof window !== 'undefined' ? !navigator.onLine : false
  )
  useEffect(() => {
    const goOffline = () => setIsOffline(true)
    const goOnline = () => setIsOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])
  return isOffline
}
