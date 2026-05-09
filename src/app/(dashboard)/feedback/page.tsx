import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Feedback',
  robots: { index: false, follow: false },
}
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'

export default async function FeedbackPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="mx-auto max-w-3xl">
      <DashboardPageHeader
        eyebrow="Feedback"
        title="Share your feedback"
        subtitle="Found a bug or have a product suggestion? Send it and we will prioritize fixes."
      />

      <div className="dashboard-premium-card mt-2 p-6 sm:p-8">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Quick options
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="mailto:support@interviewera.com?subject=InterviewEra%20Feedback"
            className="landing-cta-lift rounded-[14px] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
              boxShadow: '0 16px 48px color-mix(in srgb, var(--accent-primary) 32%, transparent)',
            }}
          >
            Email feedback
          </a>
          <Link
            href="/dashboard"
            className="rounded-[14px] border-2 px-4 py-2.5 text-sm font-semibold transition-colors"
            style={{
              borderColor: 'var(--card-border)',
              color: 'var(--text-primary)',
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
            }}
          >
            Back to dashboard
          </Link>
        </div>
        <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          Tip: include page URL, screenshot, and exact error text for faster resolution.
        </p>
      </div>
    </div>
  )
}
