import type { Metadata } from 'next'
import { CampusPageModeDashboard } from '@/components/platform/CampusPageModeDashboard'
import { privatePageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = privatePageMetadata({
  title: 'Campus page mode',
  description: 'Toggle the public /campus landing between Coming Soon and the full marketing page.',
  path: '/platform/campus-page',
})

export default function PlatformCampusPageModePage() {
  return <CampusPageModeDashboard />
}
