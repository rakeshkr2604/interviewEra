import type { ReactNode } from 'react'
import { PAGE_SEO } from '@/lib/seo/metadata'

export const metadata = PAGE_SEO.onboarding

/** Layout retained for legacy /onboarding/* URLs that redirect to script start. */
export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return children
}
