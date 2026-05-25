import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { privatePageMetadata } from '@/lib/seo/metadata'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { FeedbackForm } from '@/components/feedback/FeedbackForm'

export const metadata = privatePageMetadata({
  title: 'Feedback',
  description: 'Share feedback about your InterviewEra experience.',
  path: '/feedback',
})

function resolveName(
  profileName: string | null | undefined,
  metadataName: unknown,
  email: string | null | undefined,
): string {
  if (profileName && profileName.trim()) return profileName.trim()
  if (typeof metadataName === 'string' && metadataName.trim()) return metadataName.trim()
  if (email) return email.split('@')[0]
  return ''
}

export default async function FeedbackPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('name')
    .eq('id', user.id)
    .maybeSingle()

  const defaultName = resolveName(
    profile?.name as string | null,
    user.user_metadata?.full_name ?? user.user_metadata?.name,
    user.email,
  )

  return (
    <div className="mx-auto max-w-3xl">
      <DashboardPageHeader
        eyebrow="Feedback"
        title="Share your feedback"
        subtitle="Found a bug or have a product suggestion? Send it and we will prioritize fixes."
      />

      <div className="dashboard-premium-card mt-2 p-6 sm:p-8">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Tell us what is working — and what is not
        </p>
        <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Rate your experience and add a note. It reaches the founder directly, and we review every
          submission.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <FeedbackForm defaultName={defaultName} />
          <Link
            href="/dashboard"
            className="rounded-[14px] border-2 px-4 py-2.5 text-sm font-semibold transition-colors"
            style={{
              borderColor: 'var(--card-border)',
              color: 'var(--text-primary)',
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
            }}
          >
            Back to dashboard
          </Link>
        </div>
        <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          Prefer email? Reach us at{' '}
          <a
            href="mailto:support@interviewera.com?subject=InterviewEra%20Feedback"
            className="font-medium underline underline-offset-2"
            style={{ color: 'var(--accent-primary)' }}
          >
            support@interviewera.com
          </a>
          .
        </p>
      </div>
    </div>
  )
}
