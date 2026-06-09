import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit'
import { CreditBadge } from '@/components/layout/CreditBadge'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { DashboardMain } from './DashboardMain'
import { DashboardWelcomeCard } from './DashboardWelcomeCard'
import { RetentionProgressCard } from '@/components/dashboard/RetentionProgressCard'
import { RetentionProgressRefreshListener } from '@/components/dashboard/RetentionProgressRefreshListener'
import type { InterviewWithReportsRow } from './dashboard-types'
import { PAGE_SEO } from '@/lib/seo/metadata'
import { formatDateEnIn } from '@/lib/datetime/ist'
import { buildRetentionDashboardSnapFromRow } from '@/lib/retention/build-retention-dashboard-snap'
import type { UserProgressRow } from '@/lib/retention/types'

export const metadata = PAGE_SEO.dashboard

/** Always read latest `user_progress` + `tier_config` for the placement card. */
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const interviewsSelect = `
        id,
        role,
        difficulty,
        status,
        completed_at,
        started_at,
        reports (
          overall_score,
          generated_at
        )
      `

  const [
    { data: userData, error: userError },
    { data: interviewsRaw },
    { data: progressSnap, error: progressErr },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('name, plan_tier, credits_remaining, placement_date, created_at')
      .eq('id', user.id)
      .single(),
    supabase
      .from('interviews')
      .select(interviewsSelect)
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(5),
    supabase.from('user_progress').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  if (userError) {
    console.error('dashboard user fetch', userError.message)
  }

  const progressTableMissing = Boolean(
    progressErr &&
      (String(progressErr.code) === '42P01' ||
        (/user_progress/i.test(progressErr.message ?? '') &&
          /does not exist/i.test(progressErr.message ?? ''))),
  )

  const retentionDashboardSnap = progressTableMissing
    ? null
    : await buildRetentionDashboardSnapFromRow(
        (progressSnap as UserProgressRow | null) ?? null,
        user.id,
      )

  if (progressErr && !progressTableMissing) {
    console.error('dashboard user_progress fetch', progressErr.message)
  }

  const rows = (interviewsRaw ?? []) as InterviewWithReportsRow[]
  const completedCount = rows.filter((i) => i.status === 'completed').length

  const memberSince = userData?.created_at ? formatDateEnIn(userData.created_at) : ''

  const creditsRemaining = userData?.credits_remaining ?? 0
  const displayName = userData?.name || user.email?.split('@')[0] || 'Student'

  return (
    <>
      <RetentionProgressRefreshListener />
      <DashboardPageHeader
        eyebrow={
          <>
            <BrandWordmarkSplit className="text-[inherit]" /> analytics
          </>
        }
        title="Dashboard"
        subtitle="Track your interview performance and keep your prep on track."
        action={<CreditBadge creditsRemaining={creditsRemaining} />}
      />

      <DashboardWelcomeCard
        userData={userData}
        displayName={displayName}
        memberSince={memberSince}
        creditsRemaining={creditsRemaining}
        completedCount={completedCount}
      />

      <RetentionProgressCard snap={retentionDashboardSnap} />

      <DashboardMain rows={rows} userData={userData} />
    </>
  )
}
