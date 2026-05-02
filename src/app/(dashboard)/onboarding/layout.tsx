'use client'
import { OnboardingProvider } from '@/lib/onboarding/store'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <OnboardingProvider>{children}</OnboardingProvider>
}
