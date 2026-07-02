import { redirect } from 'next/navigation'
import { SettingsPageClient } from '@/components/settings/SettingsPageClient'
import { createClient } from '@/lib/supabase/server'
import { creditsMonthStartIsoIst } from '@/lib/settings/ist-month'
import {
  parseNotificationPreferencesJson,
} from '@/lib/settings/notification-preferences'
import { loadCandidateSnapshot } from '@/lib/candidate/load-snapshot'
import { privatePageMetadata } from '@/lib/seo/metadata'
import type { PlanTier } from '@/types/app.types'
import type { BillingPlanInfo, BillingPayment, BillingTx } from '@/components/settings/BillingUsageCard'

export const metadata = privatePageMetadata({
  title: 'Settings',
  description: 'Manage your InterviewEra account, plan, billing, and preferences.',
  path: '/settings',
})

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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

  const monthStart = creditsMonthStartIsoIst()
  const { data: debitRows } = await supabase
    .from('credit_transactions')
    .select('amount')
    .eq('user_id', user.id)
    .eq('type', 'debit')
    .gte('created_at', monthStart)

  const creditsUsedThisMonth =
    debitRows?.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) ?? 0

  const { data: paymentRows } = await supabase
    .from('payments')
    .select('id, order_id, payment_id, amount, currency, status, plan, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const recentPayments: BillingPayment[] =
    paymentRows?.map((p) => ({
      id: p.id as string,
      order_id: p.order_id as string,
      payment_id: p.payment_id as string | null,
      amount: Number(p.amount) || 0,
      currency: p.currency as string,
      status: p.status as string,
      plan: p.plan as string,
      created_at: p.created_at as string,
    })) ?? []

  const { data: txRows } = await supabase
    .from('credit_transactions')
    .select('id, type, amount, reason, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const recentTransactions: BillingTx[] =
    txRows?.map((t) => ({
      id: t.id as string,
      type: t.type as string,
      amount: Number(t.amount) || 0,
      reason: t.reason,
      created_at: t.created_at as string,
    })) ?? []

  const digestUnsub = Boolean(profile.email_digest_unsubscribed)
  const notificationPrefs = parseNotificationPreferencesJson(profile.notification_preferences)

  const profileEmail = profile.email ?? user.email ?? ''
  const profileName = profile.name ?? (user.user_metadata?.name as string | undefined) ?? null
  const profileAvatarPath =
    typeof profile.avatar_path === 'string' ? profile.avatar_path : null

  const candidateSnapshot = await loadCandidateSnapshot(user.id)

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
