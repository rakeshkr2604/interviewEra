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
  return (
    <OnboardingHydrationProvider hydration={hydration}>
      <OnboardingProvider initialData={hydration?.data}>{children}</OnboardingProvider>
    </OnboardingHydrationProvider>
  )
}
