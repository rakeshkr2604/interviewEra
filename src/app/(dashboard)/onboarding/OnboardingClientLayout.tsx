'use client'

import type { ReactNode } from 'react'
import { OnboardingProvider } from '@/lib/onboarding/store'

export function OnboardingClientLayout({ children }: { children: ReactNode }) {
  return <OnboardingProvider>{children}</OnboardingProvider>
}
