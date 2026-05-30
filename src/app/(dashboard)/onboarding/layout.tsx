import type { ReactNode } from 'react'
import { PAGE_SEO } from '@/lib/seo/metadata'
import { loadOnboardingHydration } from '@/lib/onboarding/load-hydration'
import { OnboardingClientLayout } from './OnboardingClientLayout'

export const metadata = PAGE_SEO.onboarding

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const hydration = await loadOnboardingHydration()
  return <OnboardingClientLayout hydration={hydration}>{children}</OnboardingClientLayout>
}
