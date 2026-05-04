import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CreditBadge } from '@/components/layout/CreditBadge'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { DashboardMain } from './DashboardMain'
import { DashboardMainSkeleton } from './DashboardMainSkeleton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('name, plan_tier, credits_remaining, placement_date, created_at')
    .eq('id', user.id)
    .single()

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
        eyebrow="InterviewEra analytics"
        title="Dashboard"
        subtitle="Track your interview performance and keep your prep on track."
        action={<CreditBadge creditsRemaining={creditsRemaining} />}
      />

      <Suspense fallback={<DashboardMainSkeleton />}>
        <DashboardMain
          userId={user.id}
          userData={userData}
          displayName={displayName}
          memberSince={memberSince}
          creditsRemaining={creditsRemaining}
        />
      </Suspense>
    </>
  )
}
