import type { Metadata } from 'next'
import { HiringTeamsPageModeDashboard } from '@/components/platform/HiringTeamsPageModeDashboard'
import { privatePageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = privatePageMetadata({
  title: 'Hiring Teams page mode',
  description: 'Toggle the public /teams landing between Coming Soon and the full marketing page.',
  path: '/platform/hiring-teams',
})

export default function PlatformHiringTeamsPage() {
  return <HiringTeamsPageModeDashboard />
}
