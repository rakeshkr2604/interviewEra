'use client'

/**
 * PARALLEL smoke-test route for the rebuilt voice pipeline.
 *
 * Route: /interview/session/[id]/v2
 *
 * This exists so the new VoiceSessionOrchestrator stack can be exercised end to
 * end against a real interview WITHOUT touching the production session page.
 * It loads the same data as the legacy route (GET /api/interview/[id]) and
 * hands it to the thin VoiceSessionView. Once verified in-browser, the legacy
 * route is cut over to this view and the old hooks/page are deleted.
 */
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { VoiceSessionView } from '@/components/interview/VoiceSessionView'
import { getInterviewerById } from '@/lib/config/interviewers'
import type { StaticQuestion } from '@/lib/voice/conversation/http-conversation-engine'

interface InterviewApiResponse {
  interviewerId: string | null
  role: string
  difficulty: string
  status: string
  preparing?: boolean
  questions: Array<{ id: string; question_text: string; category: string | null }>
  error?: string
}

interface LoadedSession {
  interviewerId: string | null
  role: string
  difficulty: string
  questions: StaticQuestion[]
}

export default function V2VoiceSessionPage() {
  const params = useParams<{ id: string }>()
  const interviewId = params.id
  const [session, setSession] = useState<LoadedSession | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/interview/${interviewId}`)
        const data = (await res.json()) as InterviewApiResponse
        if (cancelled) return
        if (!res.ok) {
          setError(data.error ?? 'Failed to load interview.')
          return
        }
        if (!data.questions || data.questions.length === 0) {
          setError(
            'This interview has no questions yet. Start it from the normal flow first, then open /v2.',
          )
          return
        }
        setSession({
          interviewerId: data.interviewerId,
          role: data.role,
          difficulty: data.difficulty,
          questions: data.questions.map((q) => ({
            id: q.id,
            questionText: q.question_text,
            category: q.category,
          })),
        })
      } catch {
        if (!cancelled) setError('Network error loading the interview.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [interviewId])

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center text-[var(--text-primary)]">
        <p className="text-sm text-[var(--accent-danger)]">{error}</p>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-[60dvh] items-center justify-center gap-2 text-[var(--text-secondary)]">
        <Loader2 className="animate-spin" size={18} /> Loading interview…
      </div>
    )
  }

  const interviewer = getInterviewerById(session.interviewerId)

  return (
    <VoiceSessionView
      interviewId={interviewId}
      role={session.role}
      difficulty={session.difficulty}
      interviewerId={session.interviewerId}
      interviewerName={interviewer?.name ?? 'The interviewer'}
      voice={interviewer?.gender ?? 'female'}
      tone="neutral"
      questions={session.questions}
      videoSrc={interviewer?.video ?? '/avatars/female/female-ai.mp4'}
    />
  )
}
