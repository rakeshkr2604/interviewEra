'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  modeFromFocusParam,
  parseDifficultyParam,
  parseInterviewModeParam,
} from '@/lib/interview/script-start-query'
import { StepIndicator } from '@/components/onboarding/StepIndicator'
import { cn } from '@/lib/utils'
import { Brain, ChevronRight, Sparkles, Mic2, Minus, Plus } from 'lucide-react'
import type { ParsedJobDescription, ParsedResume } from '@/types/app.types'
import { unlockAudioForInterview } from '@/lib/voice/audio-gesture'
import {
  runStartInterviewWithTelemetry,
  stashStartupClickMeta,
} from '@/lib/telemetry/interview-startup-telemetry'
import { trackInterviewEventClient } from '@/lib/analytics/interview-events'
import {
  readCameraInterviewModeEnabled,
  writeCameraInterviewModeEnabled,
} from '@/lib/settings/client-preferences'
import { stashScriptInterviewerId } from '@/lib/config/interviewers'
import { userFacingInterviewStartError } from '@/lib/interview/active-interview-policy'

/**
 * Production v2.1 script interview setup (goal → role → resume → start).
 * Creates a session via /api/interview/script/start and navigates to
 * /interview/script/{id}. Reuses the latest parsed resume when available.
 */
type Difficulty = 'easy' | 'medium' | 'hard'
type InterviewerId = 'priya' | 'arjun'
type InterviewMode = 'technical' | 'hr_behavioral' | 'mixed'
type Goal = 'fresher_placement' | 'job_switch' | 'promotion_prep' | 'general_practice'

type OnboardingStateResponse = {
  hydration?: {
    resume?: { id: string; status: string } | null
  } | null
}

const STEP_LABELS = ['You & goal', 'Resume & start']

const GOAL_CARDS: Array<{ id: Goal; emoji: string; label: string; desc: string }> = [
  { id: 'fresher_placement', emoji: '🎓', label: 'Fresher Placement', desc: 'Campus placements, first job' },
  { id: 'job_switch', emoji: '🚀', label: 'Job Switch', desc: '1–5 years experience, new role' },
  { id: 'promotion_prep', emoji: '📈', label: 'Promotion Prep', desc: 'Internal interviews, leadership roles' },
  { id: 'general_practice', emoji: '🎯', label: 'General Practice', desc: 'Stay sharp, build confidence' },
]

const ROLE_QUICK_PICKS = [
  'Software Engineer',
  'Full Stack Developer',
  'Data Analyst',
  'Product Manager',
  'Business Analyst',
]

const DIFFICULTY_QUESTIONS: Record<Difficulty, number> = { easy: 4, medium: 6, hard: 8 }
const DIFFICULTY_DURATION: Record<Difficulty, string> = {
  easy: '4-8 min',
  medium: '6-12 min',
  hard: '8-16 min',
}
const MODE_LABEL: Record<InterviewMode, string> = {
  technical: 'Technical',
  hr_behavioral: 'HR Behavioral',
  mixed: 'Mixed',
}

const INTERVIEW_TYPE_DESCRIPTION: Record<InterviewMode, string> = {
  technical: 'Backend, frontend, databases, scalability, architecture.',
  hr_behavioral: 'Behavioral, communication, leadership, confidence.',
  mixed: 'Realistic blend — ~70% technical, 30% behavioral.',
}

const TECHNICAL_ROLE_KEYWORDS = [
  'engineer', 'developer', 'dev', 'programmer', 'architect', 'backend',
  'frontend', 'fullstack', 'full stack', 'software', 'data', 'ml', 'ai',
  'devops', 'cloud', 'sre', 'platform',
]

const VOICE_INFO: Record<InterviewerId, { name: string; title: string; avatar: string }> = {
  priya: { name: 'Meera', title: 'Senior Recruiter', avatar: '/avatars/female/meera-avatar.png' },
  arjun: { name: 'Rohan', title: 'Technical Lead', avatar: '/avatars/male/rohan-avatar.png' },
}

const VOICE_PREVIEW_TEXT: Record<InterviewerId, string> = {
  priya: "Hi! I'm Meera, your AI interviewer. I'll guide you through this session.",
  arjun: "Hello! I'm Rohan, your technical interviewer. Let's dive into your experience.",
}
const AUTH_TRACE_ENABLED = process.env.NEXT_PUBLIC_IE_DIAGNOSTICS_AUTH_TRACE === '1'

function ScriptInterviewStartPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<1 | 2>(1)

  const [resumeId, setResumeId] = useState<string>('')
  const [resumeStatus, setResumeStatus] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [role, setRole] = useState<string>('')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [interviewerId, setInterviewerId] = useState<InterviewerId>('priya')
  const [interviewMode, setInterviewMode] = useState<InterviewMode>('mixed')
  const [goal, setGoal] = useState<Goal | null>(null)
  const [experienceYears, setExperienceYears] = useState<number>(2)
  const [selfIntroEnabled, setSelfIntroEnabled] = useState<boolean>(true)
  const [jobDescription, setJobDescription] = useState<string>('')
  const [voicePickerOpen, setVoicePickerOpen] = useState<boolean>(false)
  const [previewLoading, setPreviewLoading] = useState<InterviewerId | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  const [submitting, setSubmitting] = useState<boolean>(false)
  const startInFlightRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  // Resume upload (Step 2)
  const [resumeUploading, setResumeUploading] = useState(false)
  const [resumeUploadError, setResumeUploadError] = useState<string | null>(null)
  const [parsedResumeSkills, setParsedResumeSkills] = useState<string[]>([])
  const [parsedResumeData, setParsedResumeData] = useState<ParsedResume | null>(null)

  // JD file upload
  const [jdExtracting, setJdExtracting] = useState(false)
  const [jdExtractError, setJdExtractError] = useState<string | null>(null)

  // JD parse (structured card)
  const [parsedJd, setParsedJd] = useState<ParsedJobDescription | null>(null)
  const [jdParsing, setJdParsing] = useState(false)
  const [jdParseError, setJdParseError] = useState<string | null>(null)
  const [jdPreviewOpen, setJdPreviewOpen] = useState(false)
  const [jdEditMode, setJdEditMode] = useState(false)
  const jdParseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Adaptive follow-up + camera mode (persisted preference + session_context)
  const [adaptiveFollowUp, setAdaptiveFollowUp] = useState<boolean>(true)
  const [cameraMode, setCameraMode] = useState<boolean>(() => readCameraInterviewModeEnabled())

  // Hydrate role / mode / difficulty / focus from roadmap & tool deep-links.
  useEffect(() => {
    const roleParam = searchParams.get('role')?.trim()
    if (roleParam) setRole(roleParam)

    const modeParam = parseInterviewModeParam(searchParams.get('mode'))
    if (modeParam) setInterviewMode(modeParam)

    const difficultyParam = parseDifficultyParam(searchParams.get('difficulty'))
    if (difficultyParam) setDifficulty(difficultyParam)

    const focusParam = searchParams.get('focus')?.trim() ?? null
    if (!modeParam) {
      const inferred = modeFromFocusParam(focusParam)
      if (inferred) setInterviewMode(inferred)
    }
  }, [searchParams])

  // Pull the user's latest resume id so the start route's FK is satisfied.
  useEffect(() => {
    let cancelled = false
    async function loadResume() {
      try {
        const res = await fetch('/api/onboarding/state', { credentials: 'include' })
        if (!res.ok) {
          if (!cancelled) setResumeStatus('missing')
          return
        }
        const data = (await res.json()) as OnboardingStateResponse
        const id = data.hydration?.resume?.id
        const hydrationStatus = data.hydration?.resume?.status
        if (cancelled) return
        if (id && hydrationStatus === 'parsed') {
          setResumeId(id)
          setResumeStatus('ready')
          // Fetch parsed data for pills (fire-and-forget, non-blocking)
          const statusRes = await fetch(`/api/resume/status?id=${id}`, { credentials: 'include' })
          if (!cancelled && statusRes.ok) {
            const sd = (await statusRes.json()) as { status: string; parsed_data?: ParsedResume }
            if (sd.status === 'parsed' && sd.parsed_data) {
              setParsedResumeData(sd.parsed_data)
              if (sd.parsed_data.skills?.length) setParsedResumeSkills(sd.parsed_data.skills)
            } else if (sd.status !== 'parsed') {
              setResumeStatus('missing')
            }
          }
        } else if (id && (hydrationStatus === 'parsing' || hydrationStatus === 'uploading')) {
          setResumeId(id)
          setResumeStatus('loading')
        } else {
          setResumeStatus('missing')
        }
      } catch {
        if (!cancelled) setResumeStatus('missing')
      }
    }
    void loadResume()
    return () => {
      cancelled = true
    }
  }, [])

  // Default experience years based on the selected goal.
  useEffect(() => {
    if (!goal) return
    const defaults: Record<NonNullable<typeof goal>, number> = {
      fresher_placement: 0,
      job_switch: 3,
      promotion_prep: 6,
      general_practice: 2,
    }
    setExperienceYears(defaults[goal])
  }, [goal])

  const handleResumeUpload = useCallback(async (file: File) => {
    setResumeUploading(true)
    setResumeUploadError(null)
    setResumeStatus('loading')

    try {
      const fd = new FormData()
      fd.append('file', file)
      const diagnosticHeaders = AUTH_TRACE_ENABLED
        ? (() => {
            const hasSbCookie = document.cookie
              .split(';')
              .some((c) => c.trim().startsWith('sb-'))
            const authStateHint = hasSbCookie ? 'sb_cookie_present' : 'sb_cookie_absent'
            const correlationId = crypto.randomUUID().slice(0, 12)
            return {
              'x-ie-correlation-id': correlationId,
              'x-ie-client-auth-state': authStateHint,
              'x-ie-client-has-sb-cookie': hasSbCookie ? '1' : '0',
              'x-ie-client-online': navigator.onLine ? '1' : '0',
            }
          })()
        : undefined
      const uploadRes = await fetch('/api/resume/upload', {
        method: 'POST',
        credentials: 'include',
        body: fd,
        headers: diagnosticHeaders,
      })
      if (!uploadRes.ok) {
        const err = (await uploadRes.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error ?? 'Upload failed')
      }
      const { resumeId: newId } = (await uploadRes.json()) as { resumeId: string }

      const parseRes = await fetch('/api/resume/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ resumeId: newId }),
      })
      if (!parseRes.ok) throw new Error('Parse failed')

      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 1500))
        const statusRes = await fetch(`/api/resume/status?id=${newId}`, { credentials: 'include' })
        if (!statusRes.ok) continue
        const status = (await statusRes.json()) as {
          status: string
          parsed_data?: { skills?: string[] }
        }
        if (status.status === 'parsed') {
          setResumeId(newId)
          setResumeStatus('ready')
          if (status.parsed_data) {
            setParsedResumeData(status.parsed_data as ParsedResume)
            setParsedResumeSkills(status.parsed_data.skills ?? [])
          }
          return
        }
        if (status.status === 'failed') {
          throw new Error('Resume processing failed')
        }
      }
      throw new Error('Resume processing timed out. Please retry.')
    } catch (e) {
      setResumeUploadError(e instanceof Error ? e.message : 'Upload failed')
      setResumeStatus('missing')
    } finally {
      setResumeUploading(false)
    }
  }, [])

  const handleParseJd = useCallback(async (text: string) => {
    if (text.trim().length < 40) return
    setJdParsing(true)
    setJdParseError(null)
    try {
      const res = await fetch('/api/job-description/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(err?.error ?? 'Failed to parse job description')
      }
      const data = (await res.json()) as { parsed: ParsedJobDescription }
      setParsedJd(data.parsed)
    } catch (e) {
      setJdParseError(e instanceof Error ? e.message : 'Failed to parse job description')
    } finally {
      setJdParsing(false)
    }
  }, [])

  const handleJdFileExtract = useCallback(async (file: File) => {
    setJdExtracting(true)
    setJdExtractError(null)

    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/job-description/extract', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      })
      if (!res.ok) throw new Error('JD extraction failed')
      const data = (await res.json()) as { text?: string }
      if (data.text) setJobDescription(data.text)
    } catch (e) {
      setJdExtractError(e instanceof Error ? e.message : 'Extraction failed')
    } finally {
      setJdExtracting(false)
    }
  }, [])

  // Auto-parse JD when text >= 40 chars, no parsed result yet, and not in manual edit mode (debounced 800ms)
  useEffect(() => {
    if (parsedJd !== null) return
    if (jdEditMode) return
    if (jobDescription.trim().length < 40) return
    if (jdParseTimerRef.current) clearTimeout(jdParseTimerRef.current)
    jdParseTimerRef.current = setTimeout(() => void handleParseJd(jobDescription), 800)
    return () => {
      if (jdParseTimerRef.current) clearTimeout(jdParseTimerRef.current)
    }
  }, [jobDescription, parsedJd, jdEditMode, handleParseJd])

  const handlePreviewVoice = useCallback(async (id: InterviewerId) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
      previewAudioRef.current = null
    }
    setPreviewLoading(id)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: VOICE_PREVIEW_TEXT[id], voice: id }),
      })
      if (!res.ok) throw new Error('Preview failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      previewAudioRef.current = audio
      void audio.play()
      audio.onended = () => URL.revokeObjectURL(url)
    } catch {
      // Silently fail — preview is non-critical
    } finally {
      setPreviewLoading(null)
    }
  }, [])

  const handleStart = useCallback(async () => {
    if (startInFlightRef.current) return
    setError(null)
    if (!resumeId) {
      setError('No resume found on your account. Upload a resume via onboarding first.')
      return
    }
    if (!goal) {
      setError('Select an interview goal before starting.')
      return
    }
    startInFlightRef.current = true
    setSubmitting(true)

    const result = await runStartInterviewWithTelemetry({
      unlockAudio: unlockAudioForInterview,
      createSession: async () => {
        try {
          const res = await fetch('/api/interview/script/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              resumeId,
              role,
              difficulty,
              interviewerId,
              goal,
              interviewMode,
              experienceYears,
              selfIntroEnabled,
              followUpEnabled: adaptiveFollowUp,
              cameraMode,
              jobDescription,
            }),
          })

          const body = (await res.json().catch(() => null)) as {
            interviewId?: string
            error?: string
            resumeUrl?: string
          } | null

          if (res.status === 409 && body?.error === 'active_interview') {
            if (body.interviewId || (body.resumeUrl && body.resumeUrl !== '/dashboard')) {
              return { ok: true as const, interviewId: body.interviewId, resumeUrl: body.resumeUrl }
            }
            return {
              ok: false as const,
              error: userFacingInterviewStartError(409, body.error),
            }
          }
          if (res.status === 402) {
            return {
              ok: false as const,
              error: userFacingInterviewStartError(402, body?.error),
            }
          }

          if (!res.ok || !body?.interviewId) {
            return {
              ok: false as const,
              error: userFacingInterviewStartError(res.status, body?.error),
            }
          }

          return { ok: true as const, interviewId: body.interviewId, resumeUrl: body.resumeUrl }
        } catch (err) {
          return {
            ok: false as const,
            error: err instanceof Error ? err.message : 'Failed to start interview.',
          }
        }
      },
    })

    if (!result.ok) {
      setError(result.error ?? 'Failed to start interview.')
      startInFlightRef.current = false
      setSubmitting(false)
      return
    }

    const resumeUrl =
      result.resumeUrl?.trim() ||
      (result.interviewId ? `/interview/script/${result.interviewId}` : '')
    if (!resumeUrl || resumeUrl === '/dashboard') {
      setError(result.error ?? 'You already have an active interview. Open it from your dashboard.')
      startInFlightRef.current = false
      setSubmitting(false)
      return
    }

    trackInterviewEventClient('interview_created', {
      interviewId: result.interviewId ?? resumeUrl,
      engine: 'v2.1',
      role,
      difficulty,
      interviewMode,
      cameraMode,
    })

    // Match v1: clear persisted setup draft so the next visit is clean.
    void fetch('/api/onboarding/state', { method: 'DELETE', credentials: 'include' })

    if (result.interviewId) stashStartupClickMeta(result.interviewId)
    if (result.interviewId) stashScriptInterviewerId(result.interviewId, interviewerId)
    const separator = resumeUrl.includes('?') ? '&' : '?'
    router.push(
      resumeUrl.startsWith('/interview/script/')
        ? `${resumeUrl}${separator}i=${interviewerId}`
        : resumeUrl,
    )
    startInFlightRef.current = false
    setSubmitting(false)
  }, [
    resumeId,
    role,
    difficulty,
    interviewerId,
    goal,
    interviewMode,
    experienceYears,
    selfIntroEnabled,
    jobDescription,
    adaptiveFollowUp,
    cameraMode,
    router,
  ])

  const handleModeChange = useCallback((m: InterviewMode) => {
    setInterviewMode(m)
    if (m === 'technical') setInterviewerId('arjun')
    else if (m === 'hr_behavioral') setInterviewerId('priya')
  }, [])

  const canContinueStep1 = goal !== null && role.trim() !== ''
  const roleLower = role.toLowerCase()
  const isTechnicalRole = TECHNICAL_ROLE_KEYWORDS.some((k) => roleLower.includes(k))

  return (
    <div className="w-full px-3 pt-3 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:px-[30px]">
      <div className="mb-3 flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold text-(--text-primary)">Set Up Your Interview</h1>
        <p className="max-w-lg text-sm text-(--text-secondary)">
          Two quick steps — same path every time so practice stays frictionless.
        </p>
        <StepIndicator dense currentStep={step} totalSteps={2} labels={STEP_LABELS} />
      </div>

      {step === 1 ? (
        <>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[5fr_7fr] lg:items-stretch">
          {/* Left: decorative panel */}
          <div
            className="relative hidden overflow-hidden rounded-2xl border border-(--card-border)/60 lg:flex lg:flex-col lg:justify-center lg:px-6 lg:py-4"
            style={{ background: 'color-mix(in srgb, var(--card-bg) 55%, transparent)' }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 size-52 rounded-full opacity-30"
              style={{
                background:
                  'radial-gradient(circle, color-mix(in srgb, var(--accent-primary) 35%, transparent), transparent 70%)',
              }}
            />
            <div className="relative space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-(--accent-primary)/30 bg-(--accent-primary)/10 px-3 py-1 text-[11px] font-semibold text-(--accent-primary)">
                <Sparkles className="size-3" aria-hidden />
                AI Interview Training
              </div>
              <div className="space-y-1.5">
                <h2 className="text-[1.45rem] font-bold leading-[1.2] text-(--text-primary) xl:text-[1.65rem]">
                  Set your interview
                  <br />
                  <span style={{ color: 'var(--accent-primary)' }}>focus.</span>
                </h2>
                <p className="text-[13px] leading-relaxed text-(--text-secondary)">
                  Your answers shape every question, tone, and evaluation.
                </p>
              </div>
              <div className="space-y-3.5">
                {[
                  { icon: Brain, title: 'AI-calibrated questions', desc: 'Every question adapts to your exact role' },
                  { icon: Sparkles, title: 'Script-based flow', desc: 'Meera or Rohan guides you turn-by-turn' },
                  { icon: Mic2, title: 'Voice + evaluation', desc: 'Real-time speech and structured feedback' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div
                      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-(--accent-primary)/25"
                      style={{ background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)' }}
                    >
                      <Icon className="size-4 text-(--accent-primary)" aria-hidden />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-(--text-primary)">{title}</p>
                      <p className="mt-0.5 text-[11.5px] leading-snug text-(--text-secondary)">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: form card */}
          <div className="dashboard-premium-card flex flex-col">
            <div className="p-3 sm:p-4">
              <div className="space-y-3">
                {/* Goal */}
                <section aria-label="Interview goal">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-(--text-muted) sm:text-[11px]">
                    Interview goal
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {GOAL_CARDS.map((g) => {
                      const isSelected = goal === g.id
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setGoal(g.id)}
                          aria-pressed={isSelected}
                          className={cn(
                            'relative touch-manipulation rounded-xl border p-2 text-left transition-all duration-200 max-lg:min-h-[72px]',
                            isSelected
                              ? 'border-(--accent-primary) bg-(--accent-primary)/12 shadow-[0_0_0_1px_var(--accent-primary)]'
                              : 'border-(--card-border) bg-(--card-bg) hover:border-(--accent-primary)/40 hover:bg-(--accent-primary)/5',
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="shrink-0 text-base leading-none sm:text-lg" aria-hidden>
                              {g.emoji}
                            </span>
                            <p className="min-w-0 text-[11px] font-semibold leading-snug text-(--text-primary) sm:text-xs">
                              {g.label}
                            </p>
                          </div>
                          <p className="mt-0.5 text-[10px] leading-snug text-(--text-secondary) sm:text-[11px]">
                            {g.desc}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </section>

                {/* Target role */}
                <section aria-label="Target role">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-(--text-muted) sm:text-[11px]">
                    Target role
                  </p>
                  <input
                    type="text"
                    placeholder="Type your target role, or pick one below"
                    value={role}
                    maxLength={100}
                    onChange={(e) => setRole(e.target.value)}
                    className={cn(
                      'w-full rounded-xl border border-(--card-border) bg-(--bg-secondary)',
                      'px-3 py-2 text-sm text-(--text-primary) sm:px-3.5 sm:py-2.5',
                      'placeholder:text-(--text-muted) transition-all duration-200',
                      'focus:border-(--accent-primary) focus:outline-none',
                      'focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]',
                    )}
                  />
                  <div className="ie-scroll-x mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5">
                    {ROLE_QUICK_PICKS.map((pick) => (
                      <button
                        key={pick}
                        type="button"
                        onClick={() => setRole(pick)}
                        className={cn(
                          'shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-all duration-150',
                          role === pick
                            ? 'border-(--accent-primary) bg-(--accent-primary)/12 text-(--accent-primary)'
                            : 'border-(--card-border) bg-(--bg-secondary) text-(--text-secondary) hover:border-(--accent-primary)/50 hover:text-(--text-primary)',
                        )}
                      >
                        {pick}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Experience + Interview type */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                  <section aria-label="Years of experience">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-(--text-muted) sm:text-[11px]">
                      Experience
                    </p>
                    <div className="flex items-center overflow-hidden rounded-xl border border-(--card-border) bg-(--bg-secondary) transition-all duration-200 focus-within:border-(--accent-primary) focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]">
                      <button
                        type="button"
                        onClick={() => setExperienceYears(Math.max(0, experienceYears - 1))}
                        className="flex h-10 w-10 shrink-0 items-center justify-center text-(--text-secondary) transition-colors hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
                        aria-label="Decrease years"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <div className="flex flex-1 items-center justify-center gap-1">
                        <span className="text-sm font-semibold tabular-nums text-(--text-primary)">{experienceYears}</span>
                        <span className="text-[11px] text-(--text-muted)">yrs</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExperienceYears(Math.min(60, experienceYears + 1))}
                        className="flex h-10 w-10 shrink-0 items-center justify-center text-(--text-secondary) transition-colors hover:bg-(--bg-tertiary) hover:text-(--text-primary)"
                        aria-label="Increase years"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  </section>

                  <section aria-label="Interview type">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-(--text-muted) sm:text-[11px]">
                      Interview type
                    </p>
                    <div className="flex items-stretch rounded-full border border-(--card-border) bg-(--bg-secondary) p-[3px]">
                      {(['technical', 'hr_behavioral', 'mixed'] as InterviewMode[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          aria-pressed={interviewMode === m}
                          onClick={() => handleModeChange(m)}
                          className={cn(
                            'flex-1 rounded-full px-2 py-1.5 text-[11px] font-semibold transition-colors',
                            interviewMode === m
                              ? 'bg-(--accent-primary) text-white'
                              : 'text-(--text-secondary)',
                          )}
                        >
                          {m === 'technical' ? 'Technical' : m === 'hr_behavioral' ? 'HR' : 'Mixed'}
                        </button>
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-(--text-muted)">{INTERVIEW_TYPE_DESCRIPTION[interviewMode]}</p>
                    {role && isTechnicalRole && interviewMode === 'hr_behavioral' && (
                      <div className="mt-2 flex items-center justify-between rounded-xl border border-(--card-border) bg-(--bg-secondary) px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">✨</span>
                          <p className="text-xs text-(--text-secondary)">
                            <strong className="text-(--text-primary)">Technical</strong> mode might fit your role better.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInterviewMode('technical')}
                          className="rounded-lg border border-(--card-border) bg-(--bg-primary) px-3 py-1 text-xs font-semibold text-(--text-secondary) transition-all hover:border-(--accent-primary)/60 hover:text-(--accent-primary)"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                    {role && !isTechnicalRole && interviewMode === 'technical' && (
                      <div className="mt-2 flex items-center justify-between rounded-xl border border-(--card-border) bg-(--bg-secondary) px-3.5 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">✨</span>
                          <p className="text-xs text-(--text-secondary)">
                            <strong className="text-(--text-primary)">HR</strong> mode might fit your role better.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInterviewMode('hr_behavioral')}
                          className="rounded-lg border border-(--card-border) bg-(--bg-primary) px-3 py-1 text-xs font-semibold text-(--text-secondary) transition-all hover:border-(--accent-primary)/60 hover:text-(--accent-primary)"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </section>
                </div>

                {/* Interviewer voice */}
                <section aria-label="Interviewer voice">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-(--text-muted) sm:text-[11px]">
                    Interviewer voice
                  </p>
                  <div
                    className="flex items-center justify-between gap-2 rounded-xl border border-(--card-border) px-3 py-2 sm:px-4 sm:py-2.5"
                    style={{ background: 'color-mix(in srgb, var(--bg-secondary) 60%, transparent)' }}
                  >
                    <p className="truncate text-[13px] font-medium text-(--text-primary) sm:text-sm">
                      {interviewerId === 'priya' ? 'Meera' : 'Rohan'}
                      <span className="font-normal text-(--text-muted)"> · Default</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setVoicePickerOpen(true)}
                      className="min-h-[36px] rounded-lg border border-(--accent-primary)/30 bg-(--accent-primary)/10 px-2 py-1 text-[10px] font-semibold text-(--accent-primary) transition-colors hover:bg-(--accent-primary)/20 sm:min-h-0 sm:px-2.5 sm:py-1.5 sm:text-[11px]"
                    >
                      Change
                    </button>
                  </div>
                </section>

                <div className="pt-2 pb-1">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!canContinueStep1}
                    className={cn(
                      'flex w-full min-h-[44px] touch-manipulation items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 max-lg:min-h-[48px]',
                      canContinueStep1
                        ? 'bg-(--accent-primary) hover:bg-(--accent-hover) shadow-[0_4px_18px_rgba(99,102,241,0.45)]'
                        : 'cursor-not-allowed bg-(--accent-primary)/40 shadow-none',
                    )}
                  >
                    Continue
                    <ChevronRight className="size-4" aria-hidden />
                  </button>
                  {!canContinueStep1 && (
                    <p className="mt-2 text-center text-xs text-(--text-muted)">
                      {!goal ? 'Select a goal above to continue' : 'Enter your target role to continue'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {voicePickerOpen && (
          <div
            className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 p-4"
            onClick={() => setVoicePickerOpen(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-(--bg-primary) p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-1 flex items-start justify-between">
                <h3 className="text-base font-bold text-(--text-primary)">Choose interviewer voice</h3>
                <button
                  type="button"
                  onClick={() => setVoicePickerOpen(false)}
                  className="rounded-lg p-1 text-(--text-muted) transition-colors hover:bg-(--bg-secondary) hover:text-(--text-primary)"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
              <p className="mb-4 text-xs text-(--text-muted)">
                Preview a voice, then tap your choice. This applies to this interview only unless it matches Settings.
              </p>

              <p className="mb-2 text-xs font-semibold text-(--text-secondary)">Interviewer</p>
              <p className="mb-3 text-[11px] text-(--text-muted)">Pick who leads your session — you can preview their voice.</p>

              <div className="mb-4 grid grid-cols-2 gap-3">
                {(['priya', 'arjun'] as InterviewerId[]).map((id) => {
                  const info = VOICE_INFO[id]
                  const selected = interviewerId === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setInterviewerId(id)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                        selected
                          ? 'border-(--accent-primary) bg-(--accent-primary)/5'
                          : 'border-(--card-border) bg-(--bg-secondary) hover:border-(--accent-primary)/40',
                      )}
                    >
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={info.avatar} alt={info.name} className="size-14 rounded-full object-cover" />
                        {selected && (
                          <div className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-(--accent-primary)">
                            <svg className="size-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-(--text-primary)">{info.name}</p>
                        <p className="text-[11px] text-(--text-muted)">{info.title}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(['priya', 'arjun'] as InterviewerId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => void handlePreviewVoice(id)}
                    disabled={previewLoading !== null}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-(--card-border) bg-(--bg-secondary) px-3 py-2 text-xs font-medium text-(--text-secondary) transition-all hover:border-(--accent-primary)/60 hover:text-(--accent-primary) disabled:opacity-50"
                  >
                    {previewLoading === id ? (
                      <div className="size-3 animate-spin rounded-full border-2 border-(--accent-primary) border-t-transparent" />
                    ) : (
                      <svg className="size-3.5" fill="currentColor" viewBox="0 0 16 16"><path d="M3 3.5v9l10-4.5L3 3.5z"/></svg>
                    )}
                    Preview voice
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setVoicePickerOpen(false)}
                className="mt-4 w-full rounded-xl bg-(--accent-primary) py-2.5 text-sm font-semibold text-white transition-colors hover:bg-(--accent-hover)"
              >
                Confirm
              </button>
            </div>
          </div>
        )}
        </>
      ) : (
        <>
        <div className="dashboard-premium-card dashboard-premium-card--overflow-visible">
          {/* Sub-header */}
          <div className="border-b border-(--card-border)/60 px-6 py-2.5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-(--accent-primary)">Step 2 · Resume &amp; start</p>
            <h2 className="mt-0.5 text-lg font-bold text-(--text-primary)">Prepare your session</h2>
          </div>

          <div className="grid gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:grid-cols-[7fr_5fr] lg:gap-4 lg:px-[60px]">
            {/* ── LEFT: Resume + JD + Tips ── */}
            <div className="flex flex-col gap-2.5">

              {/* Resume section */}
              <div className="flex flex-col gap-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-(--text-muted)">Resume</p>

                {resumeUploading ? (
                  <div className="flex items-center gap-3 rounded-xl border border-(--card-border) bg-(--bg-secondary) p-4">
                    <div className="size-4 animate-spin rounded-full border-2 border-(--accent-primary) border-t-transparent" />
                    <p className="text-sm text-(--text-secondary)">Processing your resume…</p>
                  </div>
                ) : resumeStatus === 'ready' ? (
                  <div data-clarity-mask="true" className="rounded-xl border-2 border-green-400 bg-green-50/40 p-3 dark:bg-green-950/20 dark:border-green-600">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-green-500">
                        <svg className="size-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <p className="text-sm font-semibold text-green-800 dark:text-green-300">Resume analyzed</p>
                    </div>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {parsedResumeData?.target_role && (
                        <span className="rounded-full border border-green-400 bg-green-100/80 px-3 py-0.5 text-[11px] font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                          Role: {parsedResumeData.target_role}
                        </span>
                      )}
                      {parsedResumeSkills.length > 0 && (
                        <span className="rounded-full border border-green-400 bg-green-100/80 px-3 py-0.5 text-[11px] font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                          Skills: {parsedResumeSkills.slice(0, 4).join(', ')}{parsedResumeSkills.length > 4 ? '…' : ''}
                        </span>
                      )}
                      {parsedResumeData?.experience_estimate && (
                        <span className="rounded-full border border-green-400 bg-green-100/80 px-3 py-0.5 text-[11px] font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300">
                          Exp: {parsedResumeData.experience_estimate}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-green-700 transition-colors hover:text-green-900 dark:text-green-400 dark:hover:text-green-200">
                        <input type="file" accept=".pdf,.txt" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleResumeUpload(f) }} />
                        <svg className="size-3.5" fill="none" viewBox="0 0 16 16"><path d="M8 3v8m0 0L5 8m3 3l3-3M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        Replace resume
                      </label>
                      <button
                        type="button"
                        onClick={() => { setResumeId(''); setResumeStatus('missing'); setParsedResumeData(null); setParsedResumeSkills([]) }}
                        className="flex items-center gap-1.5 text-xs font-medium text-red-500 transition-colors hover:text-red-700"
                      >
                        <svg className="size-3.5" fill="none" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="group flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-(--card-border) bg-(--bg-secondary)/50 p-6 text-center transition-all hover:border-(--accent-primary)/60 hover:bg-(--accent-primary)/5">
                    <input type="file" accept=".pdf,.txt" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleResumeUpload(f) }} />
                    <div className="flex size-10 items-center justify-center rounded-full bg-(--bg-tertiary) transition-colors group-hover:bg-(--accent-primary)/10">
                      <svg className="size-5 text-(--text-muted) group-hover:text-(--accent-primary)" fill="none" viewBox="0 0 20 20"><path d="M10 3v10m0 0L7 10m3 3l3-3M4 15h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-(--text-secondary) group-hover:text-(--accent-primary)">Upload your resume</p>
                      <p className="mt-0.5 text-xs text-(--text-muted)">PDF or TXT · Max 5 MB</p>
                    </div>
                  </label>
                )}

                {resumeUploadError && <p className="text-xs text-red-600">{resumeUploadError}</p>}
              </div>

              {/* JD section */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-(--text-muted)">
                    Job description <span className="font-normal normal-case tracking-normal">(optional)</span>
                  </p>
                  {parsedJd && <span className="text-xs font-medium text-green-600">✓ Added</span>}
                </div>

                {parsedJd ? (
                  <div className="flex flex-col gap-2 rounded-xl border border-green-200 bg-green-50/60 p-4 dark:bg-green-950/20 dark:border-green-700">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-300">Job description ready</p>
                    <p className="text-xs text-green-700 dark:text-green-400">
                      {parsedJd.role_title} — {parsedJd.responsibilities?.length ?? 0} role focus areas · {parsedJd.requirements?.length ?? 0} requirements · {parsedJd.skills_keywords?.length ?? 0} skill keywords
                    </p>
                    <p className="text-xs text-green-700/80 dark:text-green-500">
                      Interview questions are generated from both your resume and this posting — not resume alone.
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setJdPreviewOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-50 dark:bg-transparent dark:hover:bg-green-900/30"
                      >
                        <svg className="size-3.5" fill="none" viewBox="0 0 16 16"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>
                        Preview posting
                      </button>
                      <button
                        type="button"
                        onClick={() => { setParsedJd(null); setJdEditMode(true) }}
                        className="flex items-center gap-1.5 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-50 dark:bg-transparent dark:hover:bg-green-900/30"
                      >
                        <svg className="size-3.5" fill="none" viewBox="0 0 16 16"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                        Edit text
                      </button>
                      <button
                        type="button"
                        onClick={() => { setJobDescription(''); setParsedJd(null); setJdEditMode(false); setJdParseError(null) }}
                        className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:bg-transparent"
                      >
                        × Remove JD
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex flex-col gap-2">
                    {jdParsing && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-(--bg-secondary)/90">
                        <div className="flex items-center gap-2">
                          <div className="size-4 animate-spin rounded-full border-2 border-(--accent-primary) border-t-transparent" />
                          <p className="text-xs text-(--text-secondary)">Analyzing job description…</p>
                        </div>
                      </div>
                    )}
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste the employer's job posting here for tailored questions…"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-(--card-border) bg-(--bg-secondary) px-3.5 py-3 text-sm text-(--text-primary) placeholder:text-(--text-muted) transition-all focus:border-(--accent-primary) focus:outline-none focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)]"
                    />
                    {jdEditMode && jobDescription.trim().length >= 40 && (
                      <button
                        type="button"
                        onClick={() => { setJdEditMode(false) }}
                        className="self-end rounded-lg bg-(--accent-primary) px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-(--accent-hover)"
                      >
                        Structure JD →
                      </button>
                    )}
                  </div>
                )}

                {jdParseError && <p className="text-xs text-red-600">{jdParseError}</p>}
                {jdExtractError && <p className="text-xs text-red-600">{jdExtractError}</p>}

                <label className="flex cursor-pointer items-center gap-2 self-start rounded-lg border border-(--card-border) bg-(--bg-secondary) px-3 py-1.5 text-xs font-medium text-(--text-secondary) transition-all hover:border-(--accent-primary)/60 hover:text-(--accent-primary)">
                  <input
                    type="file"
                    accept=".pdf,.txt,.docx"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) { setParsedJd(null); setJdEditMode(false); void handleJdFileExtract(f) }
                    }}
                  />
                  {jdExtracting ? (
                    <div className="size-3.5 animate-spin rounded-full border-2 border-(--accent-primary) border-t-transparent" />
                  ) : (
                    <svg className="size-3.5" fill="none" viewBox="0 0 16 16"><path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  )}
                  {jdExtracting ? 'Extracting…' : 'Upload JD file'}
                </label>

                {!parsedJd && !jdEditMode && (
                  <p className="text-xs text-(--text-muted)">
                    Optional — add a posting to get company-specific questions alongside your resume.
                  </p>
                )}
              </div>

            </div>

            {/* ── RIGHT: Session summary + Start ── */}
            <div className="flex flex-col gap-2">
              <div className="overflow-hidden rounded-2xl border border-(--card-border) bg-(--bg-secondary)">
                {/* Session card header */}
                <div className="flex items-center justify-between border-b border-(--card-border)/60 px-4 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-(--text-muted)">Your session</p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => router.push('/settings')}
                      className="flex items-center gap-1 text-xs text-(--text-muted) transition-colors hover:text-(--text-secondary)"
                    >
                      <svg className="size-3" fill="none" viewBox="0 0 14 14"><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.4"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10 10l1.06 1.06M2.93 11.07l1.06-1.06M10 4l1.06-1.07" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                      Prefs
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/settings')}
                      className="text-xs font-medium text-(--accent-primary) transition-colors hover:underline"
                    >
                      Edit →
                    </button>
                  </div>
                </div>

                {/* Session rows */}
                <div className="flex flex-col divide-y divide-(--card-border)/40">
                  {[
                    { label: 'Role', value: role || '—' },
                    { label: 'Mode', value: MODE_LABEL[interviewMode] },
                    { label: 'Questions', value: `${DIFFICULTY_QUESTIONS[difficulty]} questions` },
                    { label: 'Duration', value: `~${DIFFICULTY_DURATION[difficulty]}` },
                    { label: 'Voice', value: interviewerId === 'priya' ? 'Meera' : 'Rohan' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-1">
                      <p className="text-sm text-(--text-secondary)">{label}</p>
                      <p className="text-sm font-semibold text-(--text-primary)">{value}</p>
                    </div>
                  ))}

                  {/* Adaptive follow-up */}
                  <div className="flex items-center justify-between px-4 py-1">
                    <p className="text-sm text-(--text-secondary)">Adaptive follow-up</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-(--accent-primary)">{adaptiveFollowUp ? 'On' : 'Off'}</span>
                      <button
                        type="button"
                        onClick={() => setAdaptiveFollowUp((v) => !v)}
                        className="touch-manipulation rounded-lg border border-(--card-border) bg-(--bg-primary) px-2.5 py-0.5 text-[11px] font-medium text-(--text-secondary) transition-all hover:border-(--accent-primary)/60 hover:text-(--accent-primary) max-lg:min-h-[36px] max-lg:px-3"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Camera mode */}
                  <div className="flex items-center justify-between px-4 py-1">
                    <p className="text-sm text-(--text-secondary)">Camera mode</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-(--accent-primary)">{cameraMode ? 'On' : 'Off'}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setCameraMode((v) => {
                            const next = !v
                            writeCameraInterviewModeEnabled(next)
                            return next
                          })
                        }
                        className="touch-manipulation rounded-lg border border-(--card-border) bg-(--bg-primary) px-2.5 py-0.5 text-[11px] font-medium text-(--text-secondary) transition-all hover:border-(--accent-primary)/60 hover:text-(--accent-primary) max-lg:min-h-[36px] max-lg:px-3"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Tailoring */}
                  <div className="flex items-center justify-between px-4 py-1">
                    <p className="text-sm text-(--text-secondary)">Tailoring</p>
                    <p className={cn('text-sm font-semibold', parsedJd ? 'text-(--accent-primary)' : 'text-(--text-primary)')}>
                      {parsedJd ? 'Resume + posting' : 'Resume only'}
                    </p>
                  </div>

                  {/* Difficulty */}
                  <div className="flex items-center justify-between px-4 py-1">
                    <p className="text-sm text-(--text-secondary)">Difficulty</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-(--text-primary)">{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span>
                      <button
                        type="button"
                        onClick={() => setDifficulty((d) => d === 'easy' ? 'medium' : d === 'medium' ? 'hard' : 'easy')}
                        className="touch-manipulation rounded-lg border border-(--card-border) bg-(--bg-primary) px-2.5 py-0.5 text-[11px] font-medium text-(--text-secondary) transition-all hover:border-(--accent-primary)/60 hover:text-(--accent-primary) max-lg:min-h-[36px] max-lg:px-3"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  {/* Intro question */}
                  <div className="flex items-center justify-between px-4 py-1">
                    <div>
                      <p className="text-sm text-(--text-secondary)">Intro question</p>
                      <p className="text-[10px] text-(--text-muted)">Tell me about yourself</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={selfIntroEnabled}
                      onClick={() => setSelfIntroEnabled((v) => !v)}
                      className={cn(
                        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                        selfIntroEnabled ? 'bg-(--accent-primary)' : 'bg-(--bg-tertiary)',
                      )}
                    >
                      <span className={cn(
                        'pointer-events-none inline-block size-4 rounded-full bg-white shadow transition-transform duration-200',
                        selfIntroEnabled ? 'translate-x-4' : 'translate-x-0',
                      )} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Start button */}
              <button
                type="button"
                onClick={() => void handleStart()}
                disabled={submitting || !resumeId || resumeUploading}
                className={cn(
                  'flex w-full min-h-[44px] touch-manipulation items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 max-lg:min-h-[52px]',
                  submitting || !resumeId || resumeUploading
                    ? 'cursor-not-allowed bg-(--accent-primary)/40'
                    : 'bg-(--accent-primary) hover:bg-(--accent-hover) shadow-[0_4px_18px_rgba(99,102,241,0.45)]',
                )}
              >
                {submitting ? (
                  <>
                    <div className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Starting…
                  </>
                ) : (
                  <>🚀 Start AI Interview</>
                )}
              </button>

              {(!resumeId && !resumeUploading) ? (
                <p className="text-center text-xs text-(--text-muted)">Upload your resume on the left to begin</p>
              ) : (
                <p className="text-center text-xs text-(--text-muted)">Your AI interviewer is standing by</p>
              )}

              {error && <p className="text-center text-sm text-red-600">{error}</p>}

              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex min-h-[44px] touch-manipulation items-center justify-center gap-1 text-sm font-medium text-(--text-secondary) transition-colors hover:text-(--text-primary)"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>

        {/* JD preview modal */}
        {jdPreviewOpen && parsedJd && (
          <div
            className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 p-4"
            onClick={() => setJdPreviewOpen(false)}
          >
            <div
              className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl bg-(--bg-primary) shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 flex items-center justify-between border-b border-(--card-border) bg-(--bg-primary) px-6 py-4">
                <h3 className="text-base font-bold text-(--text-primary)">Job posting</h3>
                <button
                  type="button"
                  onClick={() => setJdPreviewOpen(false)}
                  className="rounded-lg p-1 text-(--text-muted) transition-colors hover:bg-(--bg-secondary) hover:text-(--text-primary)"
                >
                  <svg className="size-4" fill="none" viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>

              <div className="space-y-5 p-6">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-(--text-muted)">Role overview</p>
                  <div className="space-y-1">
                    {parsedJd.role_title && <p className="text-sm text-(--text-primary)"><strong>Title:</strong> {parsedJd.role_title}</p>}
                    {parsedJd.company_employer && <p className="text-sm text-(--text-primary)"><strong>Company:</strong> {parsedJd.company_employer}</p>}
                    {parsedJd.location && <p className="text-sm text-(--text-primary)"><strong>Location:</strong> {parsedJd.location}</p>}
                    {parsedJd.employment_type && <p className="text-sm text-(--text-primary)"><strong>Type:</strong> {parsedJd.employment_type}</p>}
                  </div>
                </div>

                {parsedJd.about_role && (
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-(--text-muted)">About the role</p>
                    <p className="text-sm leading-relaxed text-(--text-secondary)">{parsedJd.about_role}</p>
                  </div>
                )}

                {parsedJd.responsibilities?.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-(--text-muted)">Responsibilities</p>
                    <ul className="space-y-1.5">
                      {parsedJd.responsibilities.map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm text-(--text-secondary)">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-(--text-muted)" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsedJd.requirements?.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-(--text-muted)">Requirements</p>
                    <ul className="space-y-1.5">
                      {parsedJd.requirements.map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm text-(--text-secondary)">
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-(--text-muted)" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {parsedJd.skills_keywords?.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-(--text-muted)">Skills &amp; keywords</p>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedJd.skills_keywords.map((s) => (
                        <span key={s} className="rounded-full border border-(--card-border) bg-(--bg-secondary) px-2.5 py-0.5 text-[11px] text-(--text-secondary)">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        </>
      )}
    </div>
  )
}

export default function ScriptInterviewStartPageWithSuspense() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16 text-sm" style={{ color: 'var(--text-muted)' }}>
          Loading interview setup…
        </div>
      }
    >
      <ScriptInterviewStartPage />
    </Suspense>
  )
}
