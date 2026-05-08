import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { DashboardChrome } from '@/components/layout/DashboardChrome'

/** App shell is disallowed in robots.txt; keep HTML meta aligned so GSC is not confused. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardChrome>{children}</DashboardChrome>
}
