import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { DashboardChrome } from '@/components/layout/DashboardChrome'
import { isPlatformAdminUser } from '@/lib/admin/auth'
import { assertCoachAccess } from '@/lib/coach/access'
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
  const user = await getCachedAuthUser()

  let initialStreak = 0
  let canAccessAdmin = false
  let isPlatformAdmin = false
  let canAccessCoach = false

  if (user) {
    const [{ data: profile }, { data: progress }, platformAdmin, coachAccess] = await Promise.all([
      getCachedDashboardUserRow(user.id),
      getCachedUserProgressRow(user.id),
      isPlatformAdminUser(user.id, user.email),
      assertCoachAccess(user),
    ])

    isPlatformAdmin = platformAdmin
    canAccessAdmin =
      (profile?.plan_tier as PlanTier | undefined) === 'campus_admin' || platformAdmin
    canAccessCoach = coachAccess.allowed
    const streak = Number(progress?.current_streak ?? 0)
    initialStreak = Number.isFinite(streak) ? streak : 0
  }

  return (
    <DashboardChrome
      initialStreak={initialStreak}
      canAccessAdmin={canAccessAdmin}
      showWorkspaceSwitcher={isPlatformAdmin}
      canAccessCoach={canAccessCoach}
    >
      {children}
    </DashboardChrome>
  )
}
