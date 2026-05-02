'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { useOnboarding } from '@/lib/onboarding/store'
import { BriefingChecklist } from '@/components/onboarding/BriefingChecklist'
import { BriefingSessionViz } from '@/components/onboarding/BriefingSessionViz'
import { StepIndicator } from '@/components/onboarding/StepIndicator'
import { getInterviewerById } from '@/lib/config/interviewers'
import type { InterviewDifficulty } from '@/types/app.types'

export default function BriefingPage() {
  const router = useRouter()
  const { data } = useOnboarding()
  const [allChecked, setAllChecked] = useState(false)
  const [checklistCount, setChecklistCount] = useState(0)
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('medium')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const selectedInterviewer = data.interviewerId ? getInterviewerById(data.interviewerId) : undefined

  const handleStartInterview = async () => {
    if (!allChecked || loading) return
    setLoading(true)
    setError('')

    if (!data.resumeId) {
      setError('Resume is not ready yet. Please complete resume parsing first.')
      setLoading(false)
      return
    }
    if (!selectedInterviewer) {
      setError('Please select an interviewer before starting.')
      setLoading(false)
      return
    }

    try {
      const payload = {
        resumeId: data.resumeId,
        role: data.role,
        difficulty,
        interviewerId: selectedInterviewer.id,
      }

      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const responseData = (await response.json().catch(() => null)) as {
        interviewId?: string
        error?: string
      } | null

      if (response.status === 405) {
        setError('Internal API mismatch. Please contact support.')
        return
      }

      if (!response.ok || !responseData?.interviewId) {
        setError(responseData?.error ?? 'Failed to start interview. Please try again.')
        return
      }

      router.push(`/interview/session/${responseData.interviewId}?interviewer=${selectedInterviewer.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start interview. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-8 sm:py-10 lg:justify-center lg:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-5xl"
      >
        <div className="mb-6 text-center sm:mb-8">
          <h1 className="text-3xl font-bold text-(--text-primary)">
            Before You Begin
          </h1>
          <p className="mt-2 text-(--text-secondary)">
            Check these to get the most from your session.
          </p>
        </div>

        <div className="mb-6 sm:mb-8">
          <StepIndicator currentStep={4} totalSteps={4} labels={['Goal', 'Details', 'Resume', 'Interviewer']} />
        </div>

        <div className="dashboard-premium-card p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 lg:items-stretch">
            {/* Column 1 — settings + viz */}
            <div className="flex flex-col gap-6">
              <div className="rounded-2xl border border-(--card-border)
                              bg-(--bg-secondary) p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest
                              text-(--text-secondary)">
                  Your Interview
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-(--text-secondary)">Role: </span>
                    <span className="font-medium text-(--text-primary)">{data.role}</span>
                  </div>
                  <div>
                    <span className="text-(--text-secondary)">Mode: </span>
                    <span className="font-medium text-(--text-primary)">{data.mode}</span>
                  </div>
                  <div>
                    <span className="text-(--text-secondary)">Experience: </span>
                    <span className="font-medium text-(--text-primary)">{data.experience}</span>
                  </div>
                  <div>
                    <span className="text-(--text-secondary)">Interviewer: </span>
                    <span className="font-medium text-(--text-primary) capitalize">
                      {selectedInterviewer
                        ? `${selectedInterviewer.name} ${selectedInterviewer.gender === 'female' ? '👩' : '👨'}`
                        : 'Not selected'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-(--card-border) bg-(--bg-secondary) p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-(--text-secondary)">
                  Difficulty
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(level)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                        difficulty === level
                          ? 'border-(--accent-primary) bg-(--accent-primary)/10 text-(--accent-primary)'
                          : 'border-(--card-border) text-(--text-secondary)'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <BriefingSessionViz
                difficulty={difficulty}
                checkedCount={checklistCount}
                className="min-h-[220px] lg:min-h-0 lg:flex-1"
              />
            </div>

            {/* Column 2 — format + checklist */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-(--accent-primary)/20
                              bg-(--accent-primary)/5 p-4 text-sm
                              text-(--text-secondary) space-y-1">
                <p className="font-semibold text-(--text-primary) mb-2">
                  📋 Interview Format
                </p>
                <p>• 6–8 questions, 60 seconds each</p>
                <p>• Speak naturally — your voice is transcribed live</p>
                <p>• Up to 2 skips allowed per interview</p>
                <p>• AI feedback after every answer</p>
                <p>• Full report with scores at the end</p>
              </div>

              <BriefingChecklist
                onAllChecked={setAllChecked}
                onCheckedCountChange={setChecklistCount}
              />
            </div>

            <div className="space-y-4 border-t border-(--card-border) pt-6 lg:col-span-2">
              {error && (
                <p className="text-sm text-(--accent-danger)">{error}</p>
              )}

              <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => router.push('/onboarding/avatar')}
                  className="text-sm text-(--text-secondary)
                             hover:text-(--text-primary) transition-colors duration-200 sm:shrink-0"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleStartInterview}
                  disabled={!allChecked || loading}
                  className="w-full rounded-xl px-8 py-3 text-sm font-semibold
                             shadow-lg transition-all duration-200 sm:w-auto sm:shrink-0
                             disabled:opacity-100 disabled:cursor-not-allowed
                             enabled:shadow-[0_0_20px_var(--accent-primary)]/40"
                  style={{
                    background: allChecked && !loading
                      ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))'
                      : 'color-mix(in srgb, var(--bg-tertiary) 88%, white 12%)',
                    color: allChecked && !loading ? '#FFFFFF' : 'var(--text-secondary)',
                  }}
                >
                  {loading ? 'Starting...' : "I'm Ready — Begin Interview 🎯"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
