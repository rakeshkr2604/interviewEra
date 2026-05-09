'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function PrivacySecurityPanel({
  lastSignInAt,
  hasGoogle,
  userEmail,
}: {
  lastSignInAt: string | null
  hasGoogle: boolean
  userEmail: string
}) {
  const router = useRouter()

  const signOutEverywhere = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut({ scope: 'global' })
    if (error) {
      console.error('[settings] global signOut failed', error)
      await supabase.auth.signOut()
    }
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div
          className="rounded-xl border px-4 py-3"
          style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
        >
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Password
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            We email you a secure link — no password is stored in the browser.
          </p>
          <Link
            href="/forgot-password"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-3 inline-flex')}
          >
            Change password
          </Link>
        </div>
        <div
          className="rounded-xl border px-4 py-3"
          style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
        >
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Google account
          </p>
          <p className="mt-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {hasGoogle ? 'Connected' : 'Not connected'}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {hasGoogle
              ? `Signing in with Google is enabled for ${userEmail}.`
              : 'You are using email sign-in only.'}
          </p>
        </div>
      </div>

      <div
        className="flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Last sign-in
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {lastSignInAt
              ? new Date(lastSignInAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Asia/Kolkata',
                }) + ' IST'
              : 'Unavailable'}
          </p>
        </div>
      </div>

      <div
        className="flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Sign out everywhere
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Ends your session on this device and signs out refresh tokens across devices. Other browsers may need a
            moment to reflect the change.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => void signOutEverywhere()}>
          Sign out everywhere
        </Button>
      </div>

      <div
        className="flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Two-factor authentication
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Add a second step after your password or OAuth login.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit shrink-0">
          Coming soon
        </Badge>
      </div>
    </div>
  )
}
