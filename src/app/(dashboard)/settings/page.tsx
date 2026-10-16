import { redirect } from 'next/navigation'
import { SettingsPageClient } from '@/components/settings/SettingsPageClient'
import {
  parseNotificationPreferencesJson,
} from '@/lib/settings/notification-preferences'
import { loadBillingLedgerData } from '@/lib/settings/load-billing-data'
import { getCachedAuthUser, getCachedSupabase } from '@/lib/dashboard/request-cache'
import { loadCandidateSnapshot } from '@/lib/candidate/load-snapshot'
import { privatePageMetadata } from '@/lib/seo/metadata'
import type { PlanTier } from '@/types/app.types'
import type { BillingPlanInfo } from '@/components/settings/BillingUsageCard'

export const metadata = privatePageMetadata({
  title: 'Settings',
  description: 'Manage your InterviewEra account, plan, billing, and preferences.',
  path: '/settings',
})

export default async function SettingsPage() {
  const user = await getCachedAuthUser()
  if (!user) redirect('/login')
  const supabase = await getCachedSupabase()

  const profileSelectFull =
    'name, email, plan_tier, credits_remaining, created_at, email_digest_unsubscribed, notification_preferences, plan_status, plan_expires_at, plan_started_at, avatar_path, referral_code' as const
  const profileSelectBase =
    'name, email, plan_tier, credits_remaining, created_at, email_digest_unsubscribed, plan_status, plan_expires_at, plan_started_at, referral_code' as const

  let profile: {
    name: string | null
    email: string | null
    plan_tier: string | null
    credits_remaining: number | null
    created_at: string | null
    email_digest_unsubscribed: boolean | null
    notification_preferences?: unknown
    plan_status?: string | null
    plan_expires_at?: string | null
    plan_started_at?: string | null
    avatar_path?: string | null
    referral_code?: string | null
  } | null = null

  const full = await supabase
    .from('users')
    .select(profileSelectFull)
    .eq('id', user.id)
    .single()

  if (!full.error && full.data) {
    profile = full.data
  } else {
    const minimal = await supabase
      .from('users')
      .select(profileSelectBase)
      .eq('id', user.id)
      .single()

    if (minimal.error || !minimal.data) {
      const msg =
        typeof minimal.error?.message === 'string'
          ? minimal.error.message
          : typeof full.error?.message === 'string'
            ? full.error.message
            : 'unknown'
      const code = minimal.error?.code ?? full.error?.code
      console.error('[settings] profile fetch failed', { message: msg, code })
      redirect('/login')
    }

    profile = minimal.data
  }

  if (!profile) {
    redirect('/login')
  }

  const planTier = (profile.plan_tier ?? 'free') as PlanTier
  const creditsRemaining = profile.credits_remaining ?? 0

  const planInfo: BillingPlanInfo = {
    planStatus: (profile.plan_status as string | null) ?? 'none',
    planExpiresAt: (profile.plan_expires_at as string | null) ?? null,
    planStartedAt: (profile.plan_started_at as string | null) ?? null,
  }

  const [{ creditsUsedThisMonth, recentPayments, recentTransactions }, candidateSnapshot] =
    await Promise.all([
      loadBillingLedgerData(supabase, user.id),
      loadCandidateSnapshot(user.id, { client: supabase }),
    ])

  const digestUnsub = Boolean(profile.email_digest_unsubscribed)
  const notificationPrefs = parseNotificationPreferencesJson(profile.notification_preferences)

  const profileEmail = profile.email ?? user.email ?? ''
  const profileName = profile.name ?? (user.user_metadata?.name as string | undefined) ?? null
  const profileAvatarPath =
    typeof profile.avatar_path === 'string' ? profile.avatar_path : null

  return (
    <SettingsPageClient
      authUser={user}
      profileName={profileName}
      profileEmail={profileEmail}
      profileJoinedAt={profile.created_at as string}
      profileAvatarPath={profileAvatarPath}
      planTier={planTier}
      creditsRemaining={creditsRemaining}
      creditsUsedThisMonth={creditsUsedThisMonth}
      planInfo={planInfo}
      recentPayments={recentPayments}
      recentTransactions={recentTransactions}
      notificationPrefs={notificationPrefs}
      weeklyImprovementSummaryOn={!digestUnsub}
      candidateProfile={candidateSnapshot.profile}
      referralCode={profile.referral_code ?? null}
    />
  )
}
