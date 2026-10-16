import { createClient } from '@/lib/supabase/server'
import { creditsMonthStartIsoIst } from '@/lib/settings/ist-month'
import type {
  BillingPayment,
  BillingPlanInfo,
  BillingTx,
} from '@/components/settings/BillingUsageCard'
import type { PlanTier } from '@/types/app.types'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export type BillingSettingsData = {
  planTier: PlanTier
  creditsRemaining: number
  userEmail: string
  planInfo: BillingPlanInfo
  creditsUsedThisMonth: number
  recentPayments: BillingPayment[]
  recentTransactions: BillingTx[]
}

export type BillingLedgerData = Pick<
  BillingSettingsData,
  'creditsUsedThisMonth' | 'recentPayments' | 'recentTransactions'
>

/** Payments + credit ledger for Settings and /settings/billing. */
export async function loadBillingLedgerData(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<BillingLedgerData> {
  const monthStart = creditsMonthStartIsoIst()
  const [{ data: debitRows }, { data: paymentRows }, { data: txRows }] = await Promise.all([
    supabase
      .from('credit_transactions')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'debit')
      .gte('created_at', monthStart),
    supabase
      .from('payments')
      .select('id, order_id, payment_id, amount, currency, status, plan, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('credit_transactions')
      .select('id, type, amount, reason, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const creditsUsedThisMonth =
    debitRows?.reduce((sum, row) => sum + (Number(row.amount) || 0), 0) ?? 0

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

  const recentTransactions: BillingTx[] =
    txRows?.map((t) => ({
      id: t.id as string,
      type: t.type as string,
      amount: Number(t.amount) || 0,
      reason: t.reason,
      created_at: t.created_at as string,
    })) ?? []

  return { creditsUsedThisMonth, recentPayments, recentTransactions }
}

/**
 * Slim profile + ledger for `/settings/billing`.
 * Returns null when the users row cannot be loaded.
 */
export async function loadBillingSettingsData(
  supabase: SupabaseServerClient,
  userId: string,
  authEmail?: string | null,
): Promise<BillingSettingsData | null> {
  const { data: profile, error } = await supabase
    .from('users')
    .select('email, plan_tier, credits_remaining, plan_status, plan_expires_at, plan_started_at')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    const msg = typeof error?.message === 'string' ? error.message : 'unknown'
    console.error('[billing] profile fetch failed', { message: msg, code: error?.code })
    return null
  }

  const ledger = await loadBillingLedgerData(supabase, userId)

  return {
    planTier: (profile.plan_tier ?? 'free') as PlanTier,
    creditsRemaining: profile.credits_remaining ?? 0,
    userEmail: profile.email ?? authEmail ?? '',
    planInfo: {
      planStatus: (profile.plan_status as string | null) ?? 'none',
      planExpiresAt: (profile.plan_expires_at as string | null) ?? null,
      planStartedAt: (profile.plan_started_at as string | null) ?? null,
    },
    ...ledger,
  }
}
