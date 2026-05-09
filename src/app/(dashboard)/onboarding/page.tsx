'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { useOnboarding } from '@/lib/onboarding/store'
import { GoalSelector } from '@/components/onboarding/GoalSelector'
import { OnboardingStepIllustration } from '@/components/onboarding/OnboardingStepIllustration'
import { StepIndicator } from '@/components/onboarding/StepIndicator'
import { InterviewerPicker } from '@/components/onboarding/InterviewerPicker'
import { BriefingChecklist } from '@/components/onboarding/BriefingChecklist'
import type { InterviewGoal } from '@/types/onboarding.types'
import type { InterviewDifficulty, ParsedResume } from '@/types/app.types'
import {
  difficultyQuestionCount,
  difficultyQuestionRangeLabel,
} from '@/lib/interview/difficulty-question-count'
import { readDefaultDifficulty } from '@/lib/settings/client-preferences'
import { SINGLE_FILE_UPLOAD_MESSAGE } from '@/lib/http/form-data-single-file'
import { FaUserTie, FaBriefcase, FaFileUpload } from 'react-icons/fa'

const STEP_LABELS = ['Goal', 'Details', 'Resume & Settings']

const ROLE_QUICK_PICKS = [
  'Software Engineer',
  'Full Stack Developer',
  'Data Analyst',
  'Product Manager',
  'Business Analyst',
  'DevOps Engineer',
  'UI/UX Designer',
  'HR / People Ops',
] as const

type ResumeProcessingState = 'idle' | 'uploading' | 'processing' | 'parsed' | 'failed'

function suggestedDifficultyForGoal(goal: InterviewGoal): InterviewDifficulty {
  switch (goal) {
    case 'fresher_placement':
      return 'easy'
    case 'promotion_prep':
      return 'hard'
    case 'job_switch':
    case 'general_practice':
    default:
      return 'medium'
  }
}

type ResumeStatusPayload = {
  resumeId?: string
  status?: string
  error?: string
  ready?: boolean
  parsed_data?: ParsedResume
}

export default function OnboardingPage() {
  const router = useRouter()
  const {
    data,
    setGoal,
    setRole,
    setExperienceYears,
    setMode,
    setInterviewerId,
    setResumeId,
    setResumeData,
  } = useOnboarding()

  const [step, setStep] = useState(1)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeState, setResumeState] = useState<ResumeProcessingState>('idle')
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(null)
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>(() => readDefaultDifficulty())
  const [allChecked, setAllChecked] = useState(false)
  const [startLoading, setStartLoading] = useState(false)
  const [startError, setStartError] = useState('')
  const [jdText, setJdText] = useState('')
  const [jdFile, setJdFile] = useState<File | null>(null)
  const [jdExtractLoading, setJdExtractLoading] = useState(false)

  const canProceedStep1 = data.goal !== null
  const canProceedStep2 =
    data.role.trim().length > 0 &&
    data.experienceYears >= 0 &&
    data.interviewerId !== null

  const handleGoalSelect = (g: InterviewGoal) => {
    setGoal(g)
    setDifficulty(suggestedDifficultyForGoal(g))
  }

  useEffect(() => {
    if (!data.resumeId || resumeState !== 'processing') return

    const intervalId = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/resume/status?id=${encodeURIComponent(data.resumeId as string)}`, {
          method: 'GET',
        })

        const payload = (await res.json()) as ResumeStatusPayload
        if (!res.ok) {
          setResumeState('failed')
          setError(payload.error ?? 'Unable to check resume status. Please retry.')
          window.clearInterval(intervalId)
          return
        }

        if (payload.status === 'parsed') {
          setResumeState('parsed')
          setStatusMessage('Resume parsed successfully.')
          if (payload.parsed_data) setParsedResume(payload.parsed_data)
          window.clearInterval(intervalId)
        } else if (payload.status === 'failed') {
          setResumeState('failed')
          setError('Resume parsing failed. Please retry.')
          window.clearInterval(intervalId)
        }
      } catch {
        setResumeState('failed')
        setError('Network issue while checking resume status. Please retry.')
        window.clearInterval(intervalId)
      }
    }, 2000)

    return () => window.clearInterval(intervalId)
  }, [data.resumeId, resumeState])

  const handleUploadResume = async () => {
    if (!resumeFile || resumeState === 'uploading' || resumeState === 'processing') return
    setResumeState('uploading')
    setError('')
    setParsedResume(null)
    setStatusMessage('Processing your resume... this may take a few seconds')

    try {
      const formData = new FormData()
      formData.append('file', resumeFile)

      const res = await fetch('/api/resume/upload', {
        method: 'POST',
        body: formData,
      })

      const result = (await res.json()) as {
        resumeId?: string
        parsedSummary?: { skills?: string[] } | null
        error?: string
        code?: 'ENCRYPTED' | 'SCANNED_NO_TEXT' | 'CORRUPT' | 'UNSUPPORTED'
      }

      if (!res.ok) {
        setResumeState('failed')
        setError(result.error ?? 'Resume upload failed. Please try again.')
        return
      }

      if (!result.resumeId) {
        setResumeState('failed')
        setError('Resume upload succeeded but resume id is missing. Please retry.')
        return
      }

      setResumeId(result.resumeId)
      setResumeData({ resumeText: '', skills: [], projects: [] })

      void fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId: result.resumeId }),
      })

      setResumeState('processing')
      setStatusMessage('Analyzing your resume — usually takes 10–20 seconds…')
    } catch {
      setResumeState('failed')
      setError('Resume upload failed. Please try again.')
    }
  }

  const handleRetry = () => {
    setError('')
    setStatusMessage('')
    setParsedResume(null)
    setResumeState('idle')
  }

  const handleNext = () => {
    if (step < 3) {
      setStep((s) => s + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1)
  }

  const handleJdExtract = async () => {
    if (!jdFile || jdExtractLoading) return
    setJdExtractLoading(true)
    setStartError('')
    try {
      const fd = new FormData()
      fd.append('file', jdFile)
      const res = await fetch('/api/job-description/extract', { method: 'POST', body: fd })
      const payload = (await res.json()) as { text?: string; error?: string }
      if (!res.ok) {
        setStartError(payload.error ?? 'Could not read job description file.')
        return
      }
      if (payload.text) setJdText(payload.text)
      setJdFile(null)
    } catch {
      setStartError('Network error while reading the job description file.')
    } finally {
      setJdExtractLoading(false)
    }
  }

  const handleStartInterview = async () => {
    if (!allChecked || startLoading) return
    setStartLoading(true)
    setStartError('')

    if (!data.resumeId || !data.goal || !data.interviewerId) {
      setStartError('Missing setup data. Please complete all steps.')
      setStartLoading(false)
      return
    }

    try {
      const jdTrim = jdText.trim()
      let jobDescription: string | undefined
      if (jdTrim.length > 0) {
        const vr = await fetch('/api/job-description/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: jdTrim.slice(0, 12_000) }),
        })
        const vd = (await vr.json().catch(() => ({}))) as { error?: string }
        if (!vr.ok) {
          setStartError(vd.error ?? 'Job description does not look like a valid JD. Fix it or clear the field.')
          setStartLoading(false)
          return
        }
        jobDescription = jdTrim.slice(0, 12_000)
      }

      const interviewMode = data.mode === 'HR' ? 'hr_behavioral' : 'technical'
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: data.resumeId,
          role: data.role.trim(),
          difficulty,
          interviewerId: data.interviewerId,
          goal: data.goal,
          interviewMode,
          experienceYears: data.experienceYears,
          questionCount: difficultyQuestionCount(difficulty),
          ...(jobDescription ? { jobDescription } : {}),
        }),
      })

      const responseData = (await response.json().catch(() => null)) as {
        interviewId?: string
        error?: string
      } | null

      if (response.status === 405) {
        setStartError('Internal API mismatch. Please contact support.')
        return
      }

      if (!response.ok || !responseData?.interviewId) {
        setStartError(responseData?.error ?? 'Failed to start interview. Please try again.')
        return
      }

      router.push(`/interview/session/${responseData.interviewId}?interviewer=${data.interviewerId}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start interview. Please try again.'
      setStartError(msg)
    } finally {
      setStartLoading(false)
    }
  }

  const isProcessing = resumeState === 'uploading' || resumeState === 'processing'
  const showSuccess = resumeState === 'parsed'

  const canBegin =
    showSuccess &&
    allChecked &&
    data.goal !== null &&
    data.resumeId !== null &&
    data.interviewerId !== null

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:gap-4">
      <div className="shrink-0 text-center lg:text-left">
        <h1 className="text-2xl font-bold tracking-tight text-(--text-primary) sm:text-3xl">
          Set Up Your Interview
        </h1>
        <p className="mt-1 text-sm font-medium leading-snug text-(--text-secondary) sm:text-base">
          About a minute of setup — then practice that actually moves the needle.
        </p>
      </div>

      <div className="shrink-0">
        <StepIndicator currentStep={step} totalSteps={3} labels={STEP_LABELS} />
      </div>

      {step <= 2 ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-stretch">
          <div className="hidden min-h-0 shrink-0 lg:flex lg:flex-col lg:justify-center">
            <OnboardingStepIllustration step={step} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex min-h-0 min-w-0 flex-col overflow-hidden"
          >
            <div className="dashboard-premium-card flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold text-(--text-primary)">What is your goal?</h2>
                      <p className="mt-1 text-xs text-(--text-secondary)">
                        We personalize tone and difficulty suggestions from this.
                      </p>
                    </div>
                    <GoalSelector selected={data.goal} onSelect={handleGoalSelect} />
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold text-(--text-primary)">Tell us about yourself</h2>
                      <p className="mt-1 text-xs text-(--text-secondary)">Used to generate role-specific questions.</p>
                    </div>

                    <div className="space-y-2">
                      <div className="relative">
                        <FaUserTie
                          className="pointer-events-none absolute left-4 top-1/2 z-10 size-[1.05rem] -translate-y-1/2 text-(--text-muted)"
                          aria-hidden
                        />
                        <input
                          type="text"
                          placeholder="Target role (e.g. Software Engineer)"
                          value={data.role}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-full rounded-xl border border-(--card-border) bg-(--bg-secondary) py-2.5 pl-11 pr-4 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--accent-primary) focus:outline-none transition-colors duration-200"
                        />
                      </div>
                      <p className="text-[11px] text-(--text-muted)">Quick pick — tap to fill</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Suggested roles">
                        {ROLE_QUICK_PICKS.map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setRole(role)}
                            className={`min-h-[2rem] w-full rounded-full border px-2 py-1 text-center text-[11px] font-medium leading-snug transition-colors duration-200 sm:px-3 ${
                              data.role === role
                                ? 'border-(--accent-primary) bg-(--accent-primary)/10 text-(--accent-primary)'
                                : 'border-(--card-border) bg-(--card-bg) text-(--text-secondary) hover:border-(--accent-primary)/45 hover:text-(--text-primary)'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative">
                      <FaBriefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                      <input
                        type="number"
                        min={0}
                        max={60}
                        placeholder="Years of experience"
                        value={data.experienceYears}
                        onChange={(e) => setExperienceYears(Number.parseInt(e.target.value, 10) || 0)}
                        className="w-full rounded-xl border border-(--card-border) bg-(--bg-secondary) py-2.5 pl-11 pr-4 text-sm text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--accent-primary) focus:outline-none transition-colors duration-200"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-(--text-secondary)">Interview Mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Technical', 'HR'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMode(m)}
                            className={`rounded-xl border py-2.5 text-xs font-semibold transition-all duration-200 ${
                              data.mode === m
                                ? 'border-(--accent-primary) bg-(--accent-primary)/10 text-(--accent-primary)'
                                : 'border-(--card-border) bg-(--bg-secondary) text-(--text-secondary)'
                            }`}
                          >
                            {m === 'Technical' ? '💻 Technical' : '🤝 HR / Behavioral'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <InterviewerPicker selectedId={data.interviewerId} onSelect={setInterviewerId} />
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center justify-between border-t border-(--card-border) px-5 py-4 sm:px-7">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-sm text-(--text-secondary) transition-colors duration-200 hover:text-(--text-primary)"
                  >
                    ← Back
                  </button>
                ) : (
                  <div />
                )}
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
                  className="rounded-xl bg-(--accent-primary) px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-(--accent-hover) disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue →
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="dashboard-premium-card flex min-h-0 flex-1 flex-col overflow-hidden p-5 lg:p-7"
        >
          <div className="min-h-0 flex-1 overflow-y-auto lg:flex lg:min-h-0 lg:flex-col lg:overflow-hidden">
            <div className="grid min-h-0 gap-6 lg:flex-1 lg:grid-cols-2 lg:gap-8">
              <div className="flex min-h-0 flex-col gap-4 lg:min-h-0 lg:overflow-y-auto lg:pr-2">
                <div className="shrink-0">
                  <h2 className="text-lg font-semibold text-(--text-primary)">Resume & personalized signals</h2>
                  <p className="mt-1 text-xs text-(--text-secondary)">
                    Upload your CV here (PDF/TXT). We detect job postings mistakenly uploaded as resumes.
                  </p>
                </div>

                {!showSuccess && (
                  <div className="shrink-0">
                    <label
                      htmlFor="resumeUpload"
                      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-(--card-border) p-6 text-center transition-colors duration-200 hover:border-(--accent-primary)/50"
                    >
                      <FaFileUpload className="text-2xl text-(--accent-primary)" />
                      <span className="text-xs text-(--text-secondary)">
                        {resumeFile ? resumeFile.name : 'Click to upload PDF/TXT resume'}
                      </span>
                      <input
                        id="resumeUpload"
                        type="file"
                        accept=".pdf,.txt"
                        multiple={false}
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files
                          if (files && files.length > 1) {
                            setError(SINGLE_FILE_UPLOAD_MESSAGE)
                            e.target.value = ''
                            return
                          }
                          setResumeFile(files?.[0] ?? null)
                          setError('')
                          setStatusMessage('')
                          if (resumeState === 'failed') setResumeState('idle')
                        }}
                        disabled={isProcessing}
                      />
                    </label>
                    {resumeFile && (
                      <button
                        type="button"
                        onClick={() => void handleUploadResume()}
                        disabled={isProcessing}
                        className="mt-3 w-full rounded-xl border border-(--card-border) bg-(--bg-secondary) py-2 text-xs font-semibold text-(--text-primary) transition-colors duration-200 hover:bg-(--bg-tertiary) disabled:opacity-50"
                      >
                        {resumeState === 'uploading'
                          ? 'Uploading...'
                          : resumeState === 'processing'
                            ? 'Checking status...'
                            : 'Upload & Parse Resume'}
                      </button>
                    )}
                  </div>
                )}

                {isProcessing && (
                  <div className="shrink-0 rounded-2xl border border-(--accent-primary)/30 bg-(--accent-primary)/10 p-3">
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-(--accent-primary) border-t-transparent" />
                      <p className="text-xs text-(--text-primary)">{statusMessage}</p>
                    </div>
                  </div>
                )}

                {showSuccess && (
                  <p className="shrink-0 text-xs font-medium text-(--accent-success)">✅ Resume parsed successfully</p>
                )}

                <div className="flex max-h-[38vh] min-h-[120px] flex-col overflow-hidden rounded-xl border border-(--card-border) bg-(--bg-secondary)/80 lg:max-h-none lg:min-h-0 lg:flex-1">
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {parsedResume && showSuccess ? (
                      <div className="space-y-5 text-sm">
                        {parsedResume.projects.length > 0 && (
                          <section>
                            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-(--text-secondary)">
                              Projects
                            </h3>
                            <ul className="list-disc space-y-1.5 pl-4 text-(--text-primary)">
                              {parsedResume.projects.map((p) => (
                                <li key={p.name}>
                                  <span className="font-semibold">{p.name}</span>
                                  {p.description ? (
                                    <span className="text-(--text-secondary)">
                                      {' '}
                                      —{' '}
                                      {p.description.length > 120 ? `${p.description.slice(0, 117)}…` : p.description}
                                    </span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}

                        {parsedResume.skills.length > 0 && (
                          <section>
                            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-(--text-secondary)">
                              Skills
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                              {parsedResume.skills.map((s) => (
                                <span
                                  key={s}
                                  className="rounded-full border border-emerald-600/35 bg-[color-mix(in_srgb,#0f172a_88%,var(--card-bg)_12%)] px-2.5 py-1 text-[11px] font-medium text-emerald-100"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          </section>
                        )}

                        {parsedResume.experience.length > 0 && (
                          <section>
                            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-(--text-secondary)">
                              Experience
                            </h3>
                            <ul className="space-y-2 text-(--text-primary)">
                              {parsedResume.experience.map((ex, idx) => (
                                <li key={`${ex.company}-${idx}`} className="text-xs leading-snug">
                                  <span className="font-semibold">{ex.role}</span>
                                  <span className="text-(--text-secondary)">
                                    {' '}
                                    · {ex.company} · {ex.duration}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}

                        {parsedResume.education.length > 0 && (
                          <section>
                            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-(--text-secondary)">
                              Education
                            </h3>
                            <ul className="space-y-1.5 text-xs text-(--text-primary)">
                              {parsedResume.education.map((ed, idx) => (
                                <li key={`${ed.institution}-${idx}`}>
                                  {ed.degree} · {ed.institution} ({ed.year})
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}
                      </div>
                    ) : showSuccess ? (
                      <p className="text-xs text-(--text-muted)">
                        Parsed successfully — structured sections are loading or were sparse. You can still start when ready.
                      </p>
                    ) : (
                      <p className="text-xs text-(--text-muted)">
                        Parsed resume sections appear here after upload — nothing hidden or collapsed.
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 space-y-2 rounded-xl border border-(--card-border) bg-(--bg-secondary)/60 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-(--text-secondary)">
                    Job description (optional)
                  </h3>
                  <p className="text-[11px] leading-snug text-(--text-muted)">
                    Paste the employer JD or upload JD as PDF/TXT. Do not paste your resume here — we validate document
                    type.
                  </p>
                  <textarea
                    value={jdText}
                    maxLength={12000}
                    rows={4}
                    onChange={(e) => {
                      setJdText(e.target.value)
                      setStartError('')
                    }}
                    placeholder="Paste job responsibilities, requirements, or About the role text..."
                    className="w-full resize-y rounded-xl border border-(--card-border) bg-(--bg-secondary) px-3 py-2 text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--accent-primary) focus:outline-none"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-(--card-border) px-3 py-2 text-[11px] font-semibold text-(--text-primary) transition-colors hover:bg-(--bg-secondary)">
                      <input
                        type="file"
                        accept=".pdf,.txt"
                        multiple={false}
                        className="sr-only"
                        onChange={(e) => {
                          const files = e.target.files
                          if (files && files.length > 1) {
                            setStartError(SINGLE_FILE_UPLOAD_MESSAGE)
                            e.target.value = ''
                            return
                          }
                          setJdFile(files?.[0] ?? null)
                          setStartError('')
                        }}
                      />
                      Choose JD file (PDF/TXT)
                    </label>
                    {jdFile && (
                      <button
                        type="button"
                        disabled={jdExtractLoading}
                        onClick={() => void handleJdExtract()}
                        className="rounded-lg border border-(--card-border) px-3 py-1.5 text-[11px] font-semibold text-(--text-primary) hover:bg-(--bg-secondary) disabled:opacity-50"
                      >
                        {jdExtractLoading ? 'Reading…' : `Extract “${jdFile.name}”`}
                      </button>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="shrink-0 space-y-2">
                    <p className="text-xs text-(--accent-danger)">{error}</p>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="rounded-lg border border-(--card-border) px-3 py-1.5 text-[11px] font-semibold text-(--text-primary) hover:bg-(--bg-secondary)"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>

              <div className="flex min-h-0 flex-col gap-4 border-t border-(--card-border) pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0 lg:overflow-y-auto">
                <div className="rounded-2xl border border-(--card-border) bg-(--bg-secondary) p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-(--text-secondary)">Difficulty</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(['easy', 'medium', 'hard'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          setDifficulty(level)
                          setStartError('')
                        }}
                        className={`rounded-lg border px-2 py-2 text-xs font-medium capitalize transition-colors ${
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

                <div className="rounded-2xl border border-(--accent-primary)/20 bg-(--accent-primary)/5 p-4 text-xs leading-relaxed text-(--text-secondary)">
                  <p className="mb-2 font-semibold text-(--text-primary)">Interview format</p>
                  <p>
                    • {difficultyQuestionRangeLabel(difficulty)} questions ({difficultyQuestionCount(difficulty)} in this
                    session) · 60 seconds each
                  </p>
                  <p>• Speak naturally — voice transcribed live</p>
                  <p>• Up to 2 skips per interview</p>
                  <p>• AI feedback after every answer</p>
                  <p>• Full report with scores at the end</p>
                </div>

                <div className="shrink-0">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-(--text-secondary)">
                    Environment check
                  </p>
                  <BriefingChecklist compact onAllChecked={setAllChecked} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 shrink-0 space-y-3 border-t border-(--card-border) pt-4">
            {startError && <p className="text-xs text-(--accent-danger)">{startError}</p>}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="text-sm text-(--text-secondary) transition-colors duration-200 hover:text-(--text-primary)"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => void handleStartInterview()}
                disabled={!canBegin || startLoading}
                className="w-full rounded-xl px-6 py-3 text-sm font-semibold shadow-lg transition-all duration-200 disabled:cursor-not-allowed sm:w-auto enabled:shadow-[0_0_20px_var(--accent-primary)]/40"
                style={{
                  background:
                    canBegin && !startLoading
                      ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))'
                      : 'color-mix(in srgb, var(--bg-tertiary) 88%, white 12%)',
                  color: canBegin && !startLoading ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                {startLoading ? 'Starting...' : '🎯 I\'m Ready — Begin Interview'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
