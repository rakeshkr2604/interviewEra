import { redirect } from 'next/navigation'
import { getCachedAuthUser } from '@/lib/dashboard/request-cache'
import { assertCoachAccess } from '@/lib/coach/access'
import CoachPageClient from './CoachPageClient'
import CoachAccessRestricted from './CoachAccessRestricted'

export default async function CoachPage() {
  const user = await getCachedAuthUser()
  if (!user) {
    redirect('/login?next=/coach')
  }

  const access = await assertCoachAccess(user)
  if (!access.allowed) {
    return <CoachAccessRestricted message={access.error} />
  }

  return <CoachPageClient />
}
