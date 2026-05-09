import type { ReactNode } from 'react'
import { privatePageMetadata } from '@/lib/seo/metadata'

export const metadata = privatePageMetadata({
  title: 'Bulk invite',
  description: 'Invite students in bulk to InterviewEra campus.',
  path: '/admin/bulk-invite',
})

export default function BulkInviteLayout({ children }: { children: ReactNode }) {
  return children
}
