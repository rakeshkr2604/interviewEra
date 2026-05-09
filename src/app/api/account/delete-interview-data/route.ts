import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const bodySchema = z.object({
  confirmation: z.literal('DELETE MY HISTORY'),
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
        { error: 'Confirmation phrase must be exactly: DELETE MY HISTORY' },
        { status: 400 },
      )
    }

    const service = createServiceClient()
    const { error: delError, count } = await service
      .from('interviews')
      .delete({ count: 'exact' })
      .eq('user_id', user.id)

    if (delError) {
      console.error('[delete-interview-data]', delError)
      return NextResponse.json({ error: 'Failed to delete interview history' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, deletedCount: count ?? 0 })
  } catch (err) {
    console.error('[delete-interview-data]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
