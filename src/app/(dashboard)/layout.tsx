import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { DashboardChrome } from '@/components/layout/DashboardChrome'

/** Private app shell — noindex via layout meta + X-Robots-Tag on /dashboard (not robots.txt disallow). */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardChrome>{children}</DashboardChrome>
}
