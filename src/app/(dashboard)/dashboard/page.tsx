import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit'
import { CreditBadge } from '@/components/layout/CreditBadge'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { DashboardMain } from './DashboardMain'
import { DashboardWelcomeCard } from './DashboardWelcomeCard'
import type { InterviewWithReportsRow } from './dashboard-types'
import { PAGE_SEO } from '@/lib/seo/metadata'

export const metadata = PAGE_SEO.dashboard

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

  const [{ data: userData, error: userError }, { data: interviewsRaw }] = await Promise.all([
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
  ])

  if (userError) {
    console.error('dashboard user fetch', userError.message)
  }

  const rows = (interviewsRaw ?? []) as InterviewWithReportsRow[]
  const completedCount = rows.filter((i) => i.status === 'completed').length

  const memberSince = userData?.created_at
    ? new Date(userData.created_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : ''

  const creditsRemaining = userData?.credits_remaining ?? 0
  const displayName = userData?.name || user.email?.split('@')[0] || 'Student'

  return (
    <>
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

      <DashboardMain rows={rows} userData={userData} />
    </>
  )
}
