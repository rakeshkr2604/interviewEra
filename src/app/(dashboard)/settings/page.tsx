import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardPageHeader } from '@/components/layout/DashboardPageHeader'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <>
      <DashboardPageHeader
        eyebrow="Account"
        title="Settings"
        subtitle="Preferences and account controls — same look as the rest of InterviewEra."
      />

      <div className="mx-auto max-w-2xl space-y-4">
        {/* Theme */}
        <div className="dashboard-premium-card flex items-center justify-between px-6 py-5 sm:px-7">
          <div>
            <p
              className="font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Theme
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Dark / Light
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Interview Language */}
        <div className="dashboard-premium-card flex items-center justify-between px-6 py-5 sm:px-7">
          <div>
            <p
              className="font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Interview language
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Beta uses English only for questions and voice recognition.
            </p>
          </div>
          <div
            className="rounded-xl p-2"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-muted)',
            }}
          >
            ⚙
          </div>
        </div>

        {/* Voice preference */}
        <div className="dashboard-premium-card px-6 py-5 sm:px-7">
          <p
            className="mb-0.5 font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Voice preference
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            Used for AI interviewer TTS when available.
          </p>
          <select
            className="w-full cursor-pointer appearance-none rounded-xl border-2 px-4 py-3 text-sm font-medium"
            style={{
              background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
              color: 'var(--text-primary)',
              borderColor: 'var(--card-border)',
            }}
          >
            <option value="female">Female (Priya)</option>
            <option value="male">Male (Arjun)</option>
          </select>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Note: Voice availability depends on your browser/device voices.
          </p>
        </div>

        {/* Account info */}
        <div className="dashboard-premium-card px-6 py-5 sm:px-7">
          <p
            className="mb-3 font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Account
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Signed in as:{' '}
            <span style={{ color: 'var(--text-primary)' }}>{user.email}</span>
          </p>
        </div>
      </div>
    </>
  )
}
