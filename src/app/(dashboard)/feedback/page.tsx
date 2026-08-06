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
    <div className="mx-auto max-w-2xl">
      <DashboardPageHeader
        eyebrow="Feedback"
        title="Share your feedback"
        subtitle="It goes straight to the founder. We read every submission."
      />

      <div className="mt-2">
        <FeedbackForm defaultName={defaultName} />
      </div>

      <p className="mt-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
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
  )
}
