import { redirect } from 'next/navigation'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { BillingUsageCard } from '@/components/settings/BillingUsageCard'
import { getCachedAuthUser, getCachedSupabase } from '@/lib/dashboard/request-cache'
import { loadBillingSettingsData } from '@/lib/settings/load-billing-data'
import { privatePageMetadata } from '@/lib/seo/metadata'

export const metadata = privatePageMetadata({
  title: 'Billing',
  description: 'Manage your InterviewEra plan, credits, and one-time payments.',
  path: '/settings/billing',
})

export default async function BillingSettingsPage() {
  const user = await getCachedAuthUser()
  if (!user) redirect('/login')

  const supabase = await getCachedSupabase()
  const billing = await loadBillingSettingsData(supabase, user.id, user.email)

  if (!billing) {
    redirect('/login')
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <DashboardPageHeader
        eyebrow="Account"
        title="Billing"
        subtitle="Plan, credits, and one-time payments. Renew manually anytime — there is no auto-renewal."
        backHref="/settings"
        backLabel="Back to Settings"
      />

      <section
        className="dashboard-premium-card p-5 sm:p-6"
        aria-labelledby="billing-card-heading"
      >
        <h2 id="billing-card-heading" className="sr-only">
          Billing and usage
        </h2>
        <BillingUsageCard
          planTier={billing.planTier}
          userEmail={billing.userEmail}
          creditsRemaining={billing.creditsRemaining}
          creditsUsedThisMonth={billing.creditsUsedThisMonth}
          planInfo={billing.planInfo}
          recentPayments={billing.recentPayments}
          recentTransactions={billing.recentTransactions}
        />
      </section>
    </div>
  )
}
