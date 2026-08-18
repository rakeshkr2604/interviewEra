import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { privatePageMetadata } from '@/lib/seo/metadata'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { FeedbackForm } from '@/components/feedback/FeedbackForm'
import { TechnicalIssueStatusList } from '@/components/feedback/TechnicalIssueStatusList'
import type { FeedbackInterviewOption } from '@/lib/technical-failures/types'

export const metadata = privatePageMetadata({
  title: 'Feedback',
  description: 'Share feedback about your InterviewEra experience.',
  path: '/feedback',
})

const FEEDBACK_CATEGORIES = [
  'general',
  'bug',
  'feature',
  'interview',
  'report',
  'ai_quality',
  'technical_issue',
] as const

type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number]

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

function parseCategory(value: string | string[] | undefined): FeedbackCategory {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw && (FEEDBACK_CATEGORIES as readonly string[]).includes(raw)) {
    return raw as FeedbackCategory
  }
  return 'interview'
}

export default async function FeedbackPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const params = searchParams ? await searchParams : {}
  const initialCategory = parseCategory(params.category)

  const [{ data: profile }, { data: interviewRows }] = await Promise.all([
    supabase.from('users').select('name').eq('id', user.id).maybeSingle(),
    supabase
      .from('interviews')
      .select('id, role, difficulty, status, engine, started_at, completed_at')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false, nullsFirst: true })
      .limit(25),
  ])

  const defaultName = resolveName(
    profile?.name as string | null,
    user.user_metadata?.full_name ?? user.user_metadata?.name,
    user.email,
  )
  const interviews = (interviewRows ?? []) as FeedbackInterviewOption[]

  return (
    <div className="mx-auto max-w-2xl">
      <DashboardPageHeader
        eyebrow="Feedback"
        title="Share your feedback"
        subtitle="General product feedback goes to the founder. Interview technical issues go through a dedicated investigation workflow."
      />

      <div className="mt-2">
        <FeedbackForm
          defaultName={defaultName}
          interviews={interviews}
          initialCategory={initialCategory}
        />
      </div>

      <section
        id="technical-issue-status"
        className="mt-8 space-y-3"
        aria-labelledby="technical-issue-status-heading"
      >
        <div>
          <h2
            id="technical-issue-status-heading"
            className="text-base font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Your interview technical issues
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Track investigation status and interview-credit outcomes here.
          </p>
        </div>
        <TechnicalIssueStatusList />
      </section>

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
