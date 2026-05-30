import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadOnboardingHydration } from '@/lib/onboarding/load-hydration'
import { onboardingPersistedDraftSchema } from '@/lib/onboarding/persisted-draft'

export const dynamic = 'force-dynamic'

/** GET — full onboarding hydration (draft + resume from DB). */
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hydration = await loadOnboardingHydration()
    if (!hydration) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({ hydration })
  } catch (err) {
    console.error('[onboarding/state] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** PATCH — persist wizard snapshot to users.onboarding_draft. */
export async function PATCH(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = onboardingPersistedDraftSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid onboarding draft' },
        { status: 400 },
      )
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ onboarding_draft: parsed.data })
      .eq('id', user.id)

    if (updateError) {
      console.error('[onboarding/state] PATCH update error:', updateError)
      return NextResponse.json({ error: 'Failed to save onboarding progress' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, draft: parsed.data })
  } catch (err) {
    console.error('[onboarding/state] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE — clear saved wizard after interview successfully starts. */
export async function DELETE(): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ onboarding_draft: null })
      .eq('id', user.id)

    if (updateError) {
      console.error('[onboarding/state] DELETE error:', updateError)
      return NextResponse.json({ error: 'Failed to clear onboarding progress' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[onboarding/state] DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
