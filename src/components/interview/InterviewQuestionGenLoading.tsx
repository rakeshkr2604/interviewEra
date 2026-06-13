'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { getInterviewerById, type InterviewerId } from '@/lib/config/interviewers'
import {
  QUESTION_GEN_PROGRESS_STAGES,
  getQuestionGenHeadline,
  getQuestionGenStageIndex,
  getQuestionGenSubtext,
} from '@/lib/telemetry/startup-reliability-policy'

interface InterviewQuestionGenLoadingProps {
  role?: string | null
  interviewerId?: InterviewerId | null
}

export function InterviewQuestionGenLoading({
  role,
  interviewerId,
}: InterviewQuestionGenLoadingProps) {
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const tick = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt)
    }, 400)
    return () => window.clearInterval(tick)
  }, [])

  const stageIndex = getQuestionGenStageIndex(elapsedMs)
  const headline = getQuestionGenHeadline(stageIndex)
  const activeStage = QUESTION_GEN_PROGRESS_STAGES[stageIndex]
  const interviewer = getInterviewerById(interviewerId)

  return (
    <div
      className="flex min-h-dvh items-center justify-center p-4"
      style={{ background: 'var(--page-gradient)' }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="dashboard-premium-card w-full max-w-md space-y-5 p-6 text-center sm:p-8">
        {interviewer ? (
          <div className="flex flex-col items-center gap-2">
            <div className="relative h-14 w-14 overflow-hidden rounded-full ring-2 ring-(--accent-primary)/25">
              <Image
                src={interviewer.avatarImage}
                alt=""
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            </div>
            <p className="text-xs font-medium text-(--text-muted)">
              {interviewer.name} is preparing your session
            </p>
          </div>
        ) : (
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-(--accent-primary) border-t-transparent" />
        )}

        {role ? (
          <p className="inline-flex items-center rounded-full bg-(--accent-primary)/10 px-3 py-1 text-[11px] font-semibold text-(--accent-primary)">
            {role} mock interview
          </p>
        ) : null}

        <div className="space-y-1">
          <h1 className="text-base font-semibold text-(--text-primary)">{headline}</h1>
          <p className="text-xs leading-relaxed text-(--text-muted)">{activeStage.detail}</p>
        </div>

        <ol className="space-y-2.5 text-left" aria-label="Preparation progress">
          {QUESTION_GEN_PROGRESS_STAGES.map((step, index) => {
            const done = index < stageIndex
            const active = index === stageIndex
            return (
              <li
                key={step.id}
                className={`flex items-start gap-2.5 rounded-xl px-3 py-2 transition-colors ${
                  active
                    ? 'bg-(--accent-primary)/8'
                    : done
                      ? 'opacity-80'
                      : 'opacity-50'
                }`}
              >
                <span className="mt-0.5 shrink-0" aria-hidden="true">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin text-(--accent-primary)" />
                  ) : (
                    <span className="block h-4 w-4 rounded-full border border-(--card-border)" />
                  )}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-xs font-medium ${
                      active ? 'text-(--text-primary)' : 'text-(--text-secondary)'
                    }`}
                  >
                    {step.label}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>

        <p className="text-[11px] leading-relaxed text-(--text-muted)">{getQuestionGenSubtext()}</p>
      </div>
    </div>
  )
}
