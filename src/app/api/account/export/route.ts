import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_INTERVIEWS = 500

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

    const { data: interviews, error: intErr } = await supabase
      .from('interviews')
      .select(
        `
        id,
        resume_id,
        role,
        difficulty,
        question_count,
        status,
        started_at,
        completed_at,
        session_context,
        questions (
          id,
          order_index,
          question_text,
          category,
          rubric,
          answers (
            id,
            answer_text,
            answer_mode,
            submitted_at,
            evaluations (
              overall_score,
              dimension_scores,
              feedback_text,
              detailed_analysis
            )
          )
        ),
        reports (
          id,
          overall_score,
          radar_data,
          trend_data,
          generated_at
        )
      `,
      )
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(MAX_INTERVIEWS)

    if (intErr) {
      console.error('[account/export] interviews:', intErr)
      return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, email, name, plan_tier, created_at')
      .eq('id', user.id)
      .single()

    const payload = {
      exported_at: new Date().toISOString(),
      account: profile ?? { id: user.id, email: user.email },
      interviews: interviews ?? [],
    }

    const filename = `interviewera-export-${user.id.slice(0, 8)}.json`
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[account/export]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
