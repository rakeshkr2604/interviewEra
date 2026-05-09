import type { ReactNode } from 'react'
import { PAGE_SEO } from '@/lib/seo/metadata'
import { OnboardingClientLayout } from './OnboardingClientLayout'

export const metadata = PAGE_SEO.onboarding

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <OnboardingClientLayout>{children}</OnboardingClientLayout>
}
