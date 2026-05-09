import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { OnboardingClientLayout } from './OnboardingClientLayout'

export const metadata: Metadata = {
  title: 'Setup Your Interview',
  robots: { index: false, follow: false },
}

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <OnboardingClientLayout>{children}</OnboardingClientLayout>
}
