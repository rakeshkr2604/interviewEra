import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  confirmation: z.literal('DELETE MY ACCOUNT'),
})

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = bodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Confirmation phrase must be exactly: DELETE MY ACCOUNT' },
        { status: 400 },
      )
    }

    const service = createServiceClient()
    const userId = user.id

    const { error: dbError } = await service.from('users').delete().eq('id', userId)
    if (dbError) {
      console.error('[delete-account] public.users:', dbError)
      return NextResponse.json({ error: 'Failed to remove account data' }, { status: 500 })
    }

    const { error: authDelError } = await service.auth.admin.deleteUser(userId)
    if (authDelError) {
      console.error('[delete-account] auth.admin:', authDelError)
      return NextResponse.json(
        {
          error:
            'Account data was removed but sign-in could not be cleared. Contact support if you can still log in.',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[delete-account]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
