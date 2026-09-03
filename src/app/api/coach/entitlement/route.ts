import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveCoachEntitlement } from '@/lib/coach/entitlement'
import { assertCoachAccess } from '@/lib/coach/access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Auth + access gate + cached plan/quota snapshot for Coach UI. */
export async function GET(): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const access = await assertCoachAccess(user)
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  try {
    const entitlement = await resolveCoachEntitlement(user.id)
    return NextResponse.json(entitlement, {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[coach:entitlement] failed', err)
    return NextResponse.json(
      { error: 'Failed to resolve Coach entitlement' },
      { status: 500 }
    )
  }
}
