'use client'
import { useOffline } from '@/hooks/useOffline'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const isOffline = useOffline()
  if (!isOffline) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center
                    justify-center gap-2 bg-amber-500 px-4 py-2 text-sm
                    font-semibold text-amber-950">
      <WifiOff size={14} />
      You are offline — interview features are unavailable
    </div>
  )
}
