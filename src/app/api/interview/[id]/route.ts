import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch interview
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (interviewError || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 })
    }

    // Fetch questions
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('interview_id', id)
      .order('order_index', { ascending: true })

    if (questionsError) {
      return NextResponse.json({ error: 'Failed to load questions' }, { status: 500 })
    }

    if (!interview.interviewer_id) {
      return NextResponse.json({ error: 'Interviewer not configured for this interview' }, { status: 500 })
    }

    const questionIds = (questions ?? []).map((q: Record<string, unknown>) => String(q.id))
    let answeredCount = 0
    if (questionIds.length > 0) {
      const { count } = await supabase
        .from('answers')
        .select('id', { count: 'exact', head: true })
        .in('question_id', questionIds)
      answeredCount = count ?? 0
    }

    return NextResponse.json({
      interviewId: interview.id,
      interviewerId: interview.interviewer_id,
      role: interview.role,
      difficulty: interview.difficulty,
      answeredCount,
      currentQuestionIndex: answeredCount,
      questions: (questions || []).map((q: Record<string, unknown>) => ({
        id: q.id,
        order: q.order_index,
        question_text: q.question_text,
        category: q.category,
        rubric: q.rubric,
        timeLimit: 60,
      })),
    })
  } catch (error) {
    console.error('[interview/[id]/GET]', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
