'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { OnboardingHydration } from '@/lib/onboarding/load-hydration'

const OnboardingHydrationContext = createContext<OnboardingHydration | null>(null)

export function OnboardingHydrationProvider({
  hydration,
  children,
}: {
  hydration: OnboardingHydration | null
  children: ReactNode
}) {
  return (
    <OnboardingHydrationContext.Provider value={hydration}>
      {children}
    </OnboardingHydrationContext.Provider>
  )
}

export function useOnboardingHydration() {
  return useContext(OnboardingHydrationContext)
}
