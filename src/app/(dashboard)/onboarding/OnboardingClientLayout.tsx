'use client'

import type { ReactNode } from 'react'
import type { OnboardingHydration } from '@/lib/onboarding/load-hydration'
import { OnboardingHydrationProvider } from '@/lib/onboarding/hydration-context'
import { OnboardingProvider } from '@/lib/onboarding/store'

export function OnboardingClientLayout({
  children,
  hydration,
}: {
  children: ReactNode
  hydration: OnboardingHydration | null
}) {
  const providerKey = [
    hydration?.step ?? 0,
    hydration?.resume?.id ?? hydration?.data?.resumeId ?? 'none',
    hydration?.draft?.updatedAt ?? 'none',
  ].join(':')

  return (
    <OnboardingHydrationProvider hydration={hydration}>
      <OnboardingProvider key={providerKey} initialData={hydration?.data}>
        {children}
      </OnboardingProvider>
    </OnboardingHydrationProvider>
  )
}
