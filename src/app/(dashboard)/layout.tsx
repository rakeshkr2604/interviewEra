import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { DashboardChrome } from '@/components/layout/DashboardChrome'
import { isPlatformAdminUser } from '@/lib/admin/auth'
import { assertCoachAccess } from '@/lib/coach/access'
import { resolveOAuthPictureUrl } from '@/lib/profile/user-display'
import {
  dashboardPerfMark,
  dashboardPerfNow,
  timedDashboardSpan,
} from '@/lib/dashboard/perf-trace'
import {
  getCachedAuthUser,
  getCachedDashboardUserRow,
  getCachedUserProgressRow,
} from '@/lib/dashboard/request-cache'
import type { PlanTier } from '@/types/app.types'

/** Private app shell — noindex via layout meta + X-Robots-Tag on /dashboard (not robots.txt disallow). */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const layoutStarted = dashboardPerfNow()
  const user = await getCachedAuthUser()

  let initialStreak = 0
  let canAccessAdmin = false
  let isPlatformAdmin = false
  let canAccessCoach = false
  let topBarUser: {
    displayName: string
    email: string
    avatarPath: string | null
    oauthPictureUrl: string | null
  } | null = null

  if (user) {
    const chromeStarted = dashboardPerfNow()
    const [{ data: profile }, { data: progress }, platformAdmin, coachAccess] = await Promise.all([
      timedDashboardSpan('layout.userRow', () => getCachedDashboardUserRow(user.id)),
      timedDashboardSpan('layout.progress', () => getCachedUserProgressRow(user.id)),
      timedDashboardSpan('layout.platformAdmin', () =>
        isPlatformAdminUser(user.id, user.email),
      ),
      timedDashboardSpan('layout.coachAccess', () => assertCoachAccess(user)),
    ])
    dashboardPerfMark('layout.chrome', chromeStarted, { queryCount: 4 })

    isPlatformAdmin = platformAdmin
    canAccessAdmin =
      (profile?.plan_tier as PlanTier | undefined) === 'campus_admin' || platformAdmin
    canAccessCoach = coachAccess.allowed
    const streak = Number(progress?.current_streak ?? 0)
    initialStreak = Number.isFinite(streak) ? streak : 0

    topBarUser = {
      displayName: profile?.name || user.email?.split('@')[0] || 'Student',
      email: user.email ?? '',
      avatarPath: (profile && typeof profile.avatar_path === 'string' ? profile.avatar_path : null) ?? null,
      oauthPictureUrl: resolveOAuthPictureUrl(user.user_metadata),
    }
  }

  dashboardPerfMark('layout.total', layoutStarted)

  return (
    <DashboardChrome
      initialStreak={initialStreak}
      canAccessAdmin={canAccessAdmin}
      showWorkspaceSwitcher={isPlatformAdmin}
      canAccessCoach={canAccessCoach}
      topBarUser={topBarUser}
    >
      {children}
    </DashboardChrome>
  )
}
