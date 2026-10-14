import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PrepToolkitSection } from '@/components/prep/PrepToolkitSection'
import { SpeakingPdfShelf } from '@/components/prep/SpeakingPdfShelf'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { getCachedAuthUser } from '@/lib/dashboard/request-cache'
import { privatePageMetadata } from '@/lib/seo/metadata'

export const metadata = privatePageMetadata({
  title: 'Interview Prep',
  description:
    'Build a ChatGPT prompt, review HR frameworks, and check readiness in your workspace before the next mock.',
  path: '/prepare',
})

export const dynamic = 'force-dynamic'

export default async function PreparePage() {
  const user = await getCachedAuthUser()
  if (!user) redirect('/login?next=/prepare')

  return (
    <>
      <DashboardPageHeader
        eyebrow="Your workspace"
        title="Interview Prep"
        subtitle={
          <>
            Build stronger answers, understand your target role, and prepare with free guides and practical
            tools before your next mock. Blog posts and company guides stay in the{' '}
            <Link href="/resources" className="font-semibold underline-offset-4 hover:underline">
              resource library
            </Link>
            .
          </>
        }
      />
      <SpeakingPdfShelf />
      <PrepToolkitSection />
    </>
  )
}
