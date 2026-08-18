'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { PAID_PLANS } from '@/lib/pricing/plans'
import {
  BILLING_PAYMENT_METHODS_NOTE,
  EMPTY_PAYMENTS_MESSAGE,
  planExpiresCopy,
} from '@/lib/pricing/copy'
import { isRenewalCheckout } from '@/lib/pricing/plan-status'
import { CheckoutButton } from '@/components/pricing/CheckoutButton'
import { cn } from '@/lib/utils'
import { formatCreditLedgerReason } from '@/lib/technical-failures/status'
import type { PlanTier } from '@/types/app.types'

export type BillingTx = {
  id: string
  type: string
  amount: number
  reason: string | null
  created_at: string
}

export type BillingPayment = {
  id: string
  order_id: string
  payment_id: string | null
  amount: number
  currency: string
  status: string
  plan: string
  created_at: string
}

export type BillingPlanInfo = {
  planStatus: string
  planExpiresAt: string | null
  planStartedAt: string | null
}

function formatPlanName(tier: PlanTier): string {
  switch (tier) {
    case 'free':
      return 'Free'
    case 'starter':
      return 'Starter'
    case 'pro':
      return 'Pro'
    case 'campus':
      return 'Campus'
    case 'campus_admin':
      return 'Campus admin'
    default:
      return tier
  }
}

function planAllowanceCopy(tier: PlanTier): string | null {
  if (tier === 'free') {
    return 'Free tier includes a limited lifetime credit balance.'
  }
  if (tier === 'starter') {
    return `${PAID_PLANS.starter.credits} credits for each 30-day Starter period.`
  }
  if (tier === 'pro') {
    return `${PAID_PLANS.pro.credits} credits for each 30-day Pro period.`
  }
  if (tier === 'campus') {
    return 'Campus plans include unlimited interview credits under your institution.'
  }
  if (tier === 'campus_admin') {
    return 'Administrator access — student billing is managed from the campus dashboard.'
  }
  return null
}

function formatInrFromPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

export function BillingUsageCard({
  planTier,
  userEmail,
  creditsRemaining,
  creditsUsedThisMonth,
  planInfo,
  recentPayments,
  recentTransactions,
}: {
  planTier: PlanTier
  userEmail: string
  creditsRemaining: number
  creditsUsedThisMonth: number
  planInfo: BillingPlanInfo
  recentPayments: BillingPayment[]
  recentTransactions: BillingTx[]
}) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const isCampus = planTier === 'campus' || planTier === 'campus_admin'
  const showUpgradeNudge = planTier === 'free'
  const isPaidActive =
    (planTier === 'starter' || planTier === 'pro') &&
    planInfo.planStatus === 'active' &&
    planInfo.planExpiresAt &&
    new Date(planInfo.planExpiresAt) > new Date()

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Current plan
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {formatPlanName(planTier)}
            </p>
            {planAllowanceCopy(planTier) ? (
              <p className="mt-1.5 max-w-prose text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {planAllowanceCopy(planTier)}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {isPaidActive && (planTier === 'starter' || planTier === 'pro') ? (
              <CheckoutButton
                userEmail={userEmail}
                plan={planTier}
                source="settings"
                label="Renew plan"
                isRenewal={isRenewalCheckout(
                  planTier,
                  planTier,
                  planInfo.planExpiresAt,
                  planInfo.planStatus,
                )}
                planExpiresAt={planInfo.planExpiresAt}
                className="h-9 rounded-md px-3 text-sm font-semibold"
              />
            ) : (
              <Link
                href="/upgrade"
                className={cn(buttonVariants({ size: 'sm' }))}
              >
                {planTier === 'free' ? 'Upgrade plan' : 'Change plan'}
              </Link>
            )}
            <Button size="sm" variant="outline" type="button" onClick={() => setHistoryOpen(true)}>
              Payment history
            </Button>
          </div>
        </div>

        {!isCampus ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div
              className="rounded-xl border px-4 py-3"
              style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
            >
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Credits remaining
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {creditsRemaining}
              </p>
            </div>
            <div
              className="rounded-xl border px-4 py-3"
              style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
            >
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                Credits used (this month, IST)
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {creditsUsedThisMonth}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Your organization covers interview usage. Contact your campus admin for seat or billing questions.
          </p>
        )}

        {planInfo.planExpiresAt && (planTier === 'starter' || planTier === 'pro') ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {planExpiresCopy(planInfo.planExpiresAt, Boolean(isPaidActive))}
            {isPaidActive ? (
              <>
                {' '}
                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Renew manually anytime to extend from your current expiry date.
                </span>
              </>
            ) : null}
          </p>
        ) : null}

        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {BILLING_PAYMENT_METHODS_NOTE}
        </p>

        {showUpgradeNudge ? (
          <div
            className="rounded-2xl border-2 px-4 py-4 sm:px-5"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
              background: 'color-mix(in srgb, var(--accent-primary) 8%, var(--card-bg))',
            }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Get more credits and deeper feedback
            </p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Pay once for 30 days of access — same plans as our public pricing page, billed in INR.
            </p>
            <Link
              href="/upgrade"
              className={cn(buttonVariants({ size: 'sm' }), 'mt-2.5 inline-flex')}
            >
              View plans
            </Link>
          </div>
        ) : null}
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-h-[min(85vh,520px)] max-w-lg overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Payment history</DialogTitle>
            <DialogDescription>
              One-time plan payments and recent credit movements on your account.
            </DialogDescription>
          </DialogHeader>

          <div className="mb-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Payments
            </p>
            {recentPayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr style={{ color: 'var(--text-muted)' }}>
                      <th className="pb-2 pr-2 font-semibold">Date</th>
                      <th className="pb-2 pr-2 font-semibold">Plan</th>
                      <th className="pb-2 pr-2 font-semibold">Status</th>
                      <th className="pb-2 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: 'var(--text-primary)' }}>
                    {recentPayments.map((p) => (
                      <tr key={p.id} className="border-t border-[var(--card-border)]">
                        <td className="py-2 pr-2 align-top tabular-nums">
                          {new Date(p.created_at).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                            timeZone: 'Asia/Kolkata',
                          })}
                        </td>
                        <td className="py-2 pr-2 align-top capitalize">{p.plan}</td>
                        <td className="py-2 pr-2 align-top capitalize">{p.status}</td>
                        <td className="py-2 text-right align-top font-medium tabular-nums">
                          {formatInrFromPaise(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                {EMPTY_PAYMENTS_MESSAGE}
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Credit activity
            </p>
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="pb-2 pr-2 font-semibold">Date</th>
                  <th className="pb-2 pr-2 font-semibold">Type</th>
                  <th className="pb-2 pr-2 font-semibold">Reason</th>
                  <th className="pb-2 pr-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody style={{ color: 'var(--text-primary)' }}>
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                      No transactions yet.
                    </td>
                  </tr>
                ) : (
                  recentTransactions.map((t) => (
                    <tr key={t.id} className="border-t border-[var(--card-border)]">
                      <td className="py-2 pr-2 align-top tabular-nums">
                        {new Date(t.created_at).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                          timeZone: 'Asia/Kolkata',
                        })}
                      </td>
                      <td className="py-2 pr-2 align-top capitalize">{t.type}</td>
                      <td className="py-2 pr-2 align-top" style={{ color: 'var(--text-secondary)' }}>
                        {formatCreditLedgerReason(t.reason)}
                      </td>
                      <td className="py-2 text-right align-top font-medium tabular-nums">
                        {t.type === 'debit' ? '−' : '+'}
                        {t.amount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
