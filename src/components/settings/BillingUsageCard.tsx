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
import { PLAN_ACTIVATION_CREDITS } from '@/lib/razorpay/plan-credits'
import { cn } from '@/lib/utils'
import type { PlanTier } from '@/types/app.types'

export type BillingTx = {
  id: string
  type: string
  amount: number
  reason: string | null
  created_at: string
}

export type BillingSubscription = {
  plan: string
  status: string
  razorpay_sub_id: string | null
  current_period_start: string | null
  current_period_end: string | null
} | null

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
    return `${PLAN_ACTIVATION_CREDITS.starter} credits each month while your Starter subscription is active.`
  }
  if (tier === 'pro') {
    return `${PLAN_ACTIVATION_CREDITS.pro} credits each month while your Pro subscription is active.`
  }
  if (tier === 'campus') {
    return 'Campus plans include unlimited interview credits under your institution.'
  }
  if (tier === 'campus_admin') {
    return 'Administrator access — student billing is managed from the campus dashboard.'
  }
  return null
}

const SUPPORT_EMAIL = 'support@interviewera.com'

export function BillingUsageCard({
  planTier,
  creditsRemaining,
  creditsUsedThisMonth,
  subscription,
  recentTransactions,
}: {
  planTier: PlanTier
  creditsRemaining: number
  creditsUsedThisMonth: number
  subscription: BillingSubscription
  recentTransactions: BillingTx[]
}) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const isCampus = planTier === 'campus' || planTier === 'campus_admin'
  const showUpgradeNudge = planTier === 'free'

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
            <Link
              href="/upgrade"
              className={cn(buttonVariants({ size: 'sm' }))}
            >
              {planTier === 'free' ? 'Upgrade plan' : 'Change plan'}
            </Link>
            <Button size="sm" variant="outline" type="button" onClick={() => setHistoryOpen(true)}>
              Billing history
            </Button>
            {(planTier === 'starter' || planTier === 'pro') && subscription?.razorpay_sub_id ? (
              <Button size="sm" variant="outline" type="button" onClick={() => setManageOpen(true)}>
                Manage subscription
              </Button>
            ) : null}
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

        {subscription?.current_period_end && (planTier === 'starter' || planTier === 'pro') ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Current access period ends{' '}
            <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
              {new Date(subscription.current_period_end).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'Asia/Kolkata',
              })}
            </span>{' '}
            (IST).
          </p>
        ) : null}

        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Payments are processed securely by Razorpay. Credits are deducted when an interview starts.
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
              Upgrade when you are ready — same plans as our public pricing page, billed in INR.
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
            <DialogTitle>Billing history</DialogTitle>
            <DialogDescription>
              Recent credit movements on your account ({recentTransactions.length} shown).
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  <th className="pb-2 pr-2 font-semibold">Date</th>
                  <th className="pb-2 pr-2 font-semibold">Type</th>
                  <th className="pb-2 pr-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody style={{ color: 'var(--text-primary)' }}>
                {recentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center" style={{ color: 'var(--text-muted)' }}>
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
          {recentTransactions.some((t) => t.reason) ? (
            <div className="space-y-1 border-t border-[var(--card-border)] pt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Notes
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                {recentTransactions
                  .filter((t) => t.reason)
                  .slice(0, 6)
                  .map((t) => (
                    <li key={`${t.id}-reason`}>{t.reason}</li>
                  ))}
              </ul>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage subscription</DialogTitle>
            <DialogDescription>
              Changes to billing, cancellation, or payment methods are handled securely through Razorpay and our support team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {subscription?.razorpay_sub_id ? (
              <p>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  Subscription reference
                </span>
                <br />
                <code className="mt-1 inline-block rounded-md border border-[var(--card-border)] bg-[var(--bg-secondary)] px-2 py-1 text-xs break-all">
                  {subscription.razorpay_sub_id}
                </code>
              </p>
            ) : null}
            <p>
              Email{' '}
              <a className="font-medium text-[var(--accent-primary)] underline-offset-2 hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>{' '}
              from your registered address. Include the reference above and whether you want to cancel, change plan, or update payment details.
            </p>
            <Link href="/upgrade" className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))}>
              Compare plans
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
