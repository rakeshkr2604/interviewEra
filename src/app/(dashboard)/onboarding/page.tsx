'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'motion/react'
import { useOnboarding } from '@/lib/onboarding/store'
import { OnboardingStepGoalProfile } from '@/components/onboarding/OnboardingStepGoalProfile'
import { StepIndicator } from '@/components/onboarding/StepIndicator'
import { BriefingChecklist } from '@/components/onboarding/BriefingChecklist'
import type { InterviewDifficulty, ParsedJobDescription, ParsedResume } from '@/types/app.types'
import {
  difficultyQuestionCount,
} from '@/lib/interview/difficulty-question-count'
import { readDefaultDifficulty, readPreferredInterviewerId } from '@/lib/settings/client-preferences'
import { useResolvedInterviewSetupPreferences } from '@/lib/interview/use-resolved-interview-setup-preferences'
import { getInterviewerById } from '@/lib/config/interviewers'
import { SINGLE_FILE_UPLOAD_MESSAGE } from '@/lib/http/form-data-single-file'
import { parseResponseJsonSafe } from '@/lib/http/parse-response-json'
import { refineJobDescriptionForUi } from '@/lib/documents/job-description-clean'
import { formatParsedJobDescriptionForInterview } from '@/lib/documents/job-description-interview-brief'
import { ParsedJobDescriptionSections } from '@/components/onboarding/ParsedJobDescriptionSections'
import { jobDescriptionSummaryLine } from '@/lib/onboarding/job-description-summary-line'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FaFileUpload } from 'react-icons/fa'

const STEP_LABELS = ['You & goal', 'Resume & start']
const TOTAL_STEPS = 2

type ResumeProcessingState = 'idle' | 'uploading' | 'processing' | 'parsed' | 'failed'

type ResumeStatusPayload = {
  resumeId?: string
  status?: string
  error?: string
  ready?: boolean
  parsed_data?: ParsedResume
}

const JD_PARSE_MIN_LEN = 40

type JdParseStatus = 'idle' | 'parsing' | 'ready' | 'failed'

export default function OnboardingPage() {
  const router = useRouter()
  const { resolved, refresh: refreshResolvedPreferences } = useResolvedInterviewSetupPreferences()
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
  const [difficultyTouched, setDifficultyTouched] = useState(false)
  const [allChecked, setAllChecked] = useState(false)
  const [startLoading, setStartLoading] = useState(false)
  const [startError, setStartError] = useState('')
  const [jdText, setJdText] = useState('')
  const [jdFile, setJdFile] = useState<File | null>(null)
  const [jdExtractLoading, setJdExtractLoading] = useState(false)
  const [parsedJd, setParsedJd] = useState<ParsedJobDescription | null>(null)
  const [jdParseStatus, setJdParseStatus] = useState<JdParseStatus>('idle')
  const [jdParseError, setJdParseError] = useState('')
  const [jdShowRawEditor, setJdShowRawEditor] = useState(false)
  const jdParseSeq = useRef(0)

  const canProceedStep1 =
    data.goal !== null &&
    data.role.trim().length > 0 &&
    data.experienceYears >= 0 &&
    data.interviewerId !== null

  useEffect(() => {
    if (data.interviewerId === null) {
      setInterviewerId(readPreferredInterviewerId())
    }
  }, [data.interviewerId, setInterviewerId])

  /** Same-tab Settings edits do not emit `storage`; refresh on the resume step. */
  useEffect(() => {
    if (step >= 2) refreshResolvedPreferences()
  }, [step, refreshResolvedPreferences])

  /** Align session difficulty with Settings on the resume step unless user overrode. */
  useEffect(() => {
    if (step !== 2 || difficultyTouched) return
    refreshResolvedPreferences()
    setDifficulty(readDefaultDifficulty())
  }, [step, difficultyTouched, refreshResolvedPreferences])

  const runJdParse = useCallback(async (textOverride?: string) => {
    const source = textOverride ?? jdText
    const base = refineJobDescriptionForUi(source).trim()
    if (base.length < JD_PARSE_MIN_LEN) {
      setParsedJd(null)
      setJdParseStatus('idle')
      setJdParseError('')
      return
    }
    jdParseSeq.current += 1
    const seq = jdParseSeq.current
    setJdParseStatus('parsing')
    setJdParseError('')
    try {
      const res = await fetch('/api/job-description/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: base.slice(0, 12_000) }),
      })
      const data = (await res.json()) as { parsed?: ParsedJobDescription; error?: string }
      if (seq !== jdParseSeq.current) return
      if (!res.ok) {
        setParsedJd(null)
        setJdParseStatus('failed')
        setJdParseError(data.error ?? 'Could not structure job description.')
        return
      }
      if (data.parsed) {
        setParsedJd(data.parsed)
        setJdParseStatus('ready')
      } else {
        setParsedJd(null)
        setJdParseStatus('failed')
        setJdParseError('Invalid parse response.')
      }
    } catch {
      if (seq !== jdParseSeq.current) return
      setParsedJd(null)
      setJdParseStatus('failed')
      setJdParseError('Network error while structuring job description.')
    }
  }, [jdText])

  useEffect(() => {
    if (step !== 2 || jdShowRawEditor) return
    const t = jdText.trim()
    if (t.length < JD_PARSE_MIN_LEN) {
      setParsedJd(null)
      setJdParseStatus('idle')
      setJdParseError('')
      return
    }
    const id = window.setTimeout(() => {
      void runJdParse()
    }, 650)
    return () => window.clearTimeout(id)
  }, [step, jdText, jdShowRawEditor, runJdParse])

  useEffect(() => {
    if (!data.resumeId || resumeState !== 'processing') return

    const intervalId = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/resume/status?id=${encodeURIComponent(data.resumeId as string)}`, {
          method: 'GET',
          credentials: 'include',
        })

        const payload = await parseResponseJsonSafe<ResumeStatusPayload>(res)
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
        credentials: 'include',
      })

      const result = await parseResponseJsonSafe<{
        resumeId?: string
        parsedSummary?: { skills?: string[] } | null
        error?: string
        code?: 'ENCRYPTED' | 'SCANNED_NO_TEXT' | 'CORRUPT' | 'UNSUPPORTED'
      }>(res)

      if (!res.ok) {
        setResumeState('failed')
        setError(
          result.error ??
            (res.status >= 500
              ? 'Server error while uploading. Please try again.'
              : 'Resume upload failed. Please try again.'),
        )
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
    if (step < TOTAL_STEPS) {
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
      if (payload.text) {
        setJdText(payload.text)
        setJdShowRawEditor(false)
      }
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
        const vd = (await vr.json().catch(() => ({}))) as { error?: string; text?: string }
        if (!vr.ok) {
          setStartError(vd.error ?? 'Job description does not look like a valid JD. Fix it or clear the field.')
          setStartLoading(false)
          return
        }
        const normalized =
          typeof vd.text === 'string' && vd.text.length > 0
            ? vd.text
            : refineJobDescriptionForUi(jdTrim).slice(0, 12_000)
        setJdText(normalized)
        const structured =
          parsedJd && jdParseStatus === 'ready'
            ? formatParsedJobDescriptionForInterview(parsedJd).trim()
            : ''
        jobDescription = (structured.length >= 24 ? structured : normalized).slice(0, 12_000)
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

  const interviewerName = getInterviewerById(data.interviewerId)?.name ?? resolved.interviewerName
  const voiceIsSettingsDefault = data.interviewerId === resolved.interviewerId

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-2 pb-4 max-lg:pb-6 lg:max-h-full lg:max-w-6xl lg:min-h-0 lg:gap-2 lg:overflow-hidden lg:pb-0">
      <div className="flex shrink-0 flex-col items-center gap-2 text-center sm:gap-2.5">
        <div className="min-w-0 max-w-lg">
          <h1 className="text-2xl font-bold tracking-tight text-(--text-primary) sm:text-3xl lg:text-xl lg:leading-snug">
            Set Up Your Interview
          </h1>
          <p className="mt-0.5 text-sm font-medium leading-snug text-(--text-secondary) sm:text-base lg:mt-1 lg:text-xs lg:leading-snug">
            Two quick steps — same path every time so practice stays frictionless.
          </p>
        </div>
        <StepIndicator dense currentStep={step} totalSteps={TOTAL_STEPS} labels={STEP_LABELS} />
      </div>

      {step === 1 ? (
        <OnboardingStepGoalProfile
          goal={data.goal}
          role={data.role}
          experienceYears={data.experienceYears}
          mode={data.mode}
          interviewerId={data.interviewerId}
          onGoalSelect={setGoal}
          onRoleChange={setRole}
          onExperienceYearsChange={setExperienceYears}
          onModeChange={setMode}
          onInterviewerSelect={setInterviewerId}
          interviewerDisplayName={interviewerName}
          voiceMatchesSettingsDefault={voiceIsSettingsDefault}
          onResetVoiceToSettings={() => {
            setInterviewerId(resolved.interviewerId)
            refreshResolvedPreferences()
          }}
          canContinue={canProceedStep1}
          onContinue={handleNext}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="dashboard-premium-card mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden lg:max-w-4xl"
        >
          <header className="shrink-0 border-b border-(--card-border)/80 px-4 py-2.5 text-center sm:px-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--accent-primary)">Step 2 · Resume</p>
            <h2 className="mt-0.5 text-lg font-bold tracking-tight text-(--text-primary) sm:text-xl">
              Upload, confirm, start
            </h2>
            <p className="mx-auto mt-1 max-w-lg text-[11px] leading-snug text-(--text-secondary) sm:text-xs">
              Add your resume, then optionally attach an employer posting.
            </p>
          </header>

          <div className="min-h-0 flex-1 max-lg:max-h-[min(82dvh,44rem)] max-lg:overflow-y-auto max-lg:overscroll-y-contain max-lg:pb-6 lg:overflow-hidden lg:px-5 lg:py-2">
            <div className="flex min-h-0 flex-col gap-3 px-4 py-2 pb-8 sm:px-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-5 lg:gap-y-2 lg:px-0 lg:py-0 lg:pb-4">
              <div className="flex min-h-0 flex-col gap-3 lg:min-h-0 lg:gap-2 lg:overflow-y-auto lg:overscroll-y-contain lg:pb-2 lg:pr-0.5">
                {!showSuccess && !isProcessing && (
                  <div className="shrink-0">
                    <label
                      htmlFor="resumeUpload"
                      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-(--card-border) bg-(--bg-secondary)/30 p-5 text-center transition-all duration-200 hover:border-(--accent-primary)/55 hover:bg-[color-mix(in_srgb,var(--accent-primary)_6%,var(--card-bg))] sm:p-6"
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
                    {resumeFile ? (
                      <button
                        type="button"
                        onClick={() => void handleUploadResume()}
                        disabled={isProcessing}
                        className="mt-4 w-full rounded-xl bg-(--accent-primary) py-2.5 text-xs font-semibold text-white shadow-md transition-colors duration-200 hover:bg-(--accent-hover) disabled:opacity-50"
                      >
                        Upload & parse resume
                      </button>
                    ) : null}
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

                {showSuccess ? (
                  <div className="rounded-xl border border-emerald-600/25 bg-[color-mix(in_srgb,var(--accent-success)_8%,var(--card-bg))] p-3 sm:p-4">
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Resume parsed successfully</p>
                        <p className="mt-1 text-xs text-(--text-muted)">
                          Optional: open the preview to verify — not required to start.
                        </p>
                      </div>
                      {parsedResume ? (
                        <Dialog>
                          <DialogTrigger
                            className="w-full rounded-lg border border-(--card-border) bg-(--card-bg) px-3 py-2 text-center text-xs font-semibold text-(--text-primary) shadow-sm transition-colors hover:bg-(--bg-tertiary) sm:w-auto sm:self-start"
                          >
                            View parsed resume
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl p-0">
                            <DialogHeader className="border-b border-(--card-border) p-4 sm:p-5">
                              <DialogTitle>Parsed Resume Details</DialogTitle>
                              <DialogDescription>
                                Review extracted sections. You can close this and continue without any extra step.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-5">
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
                                              {p.description.length > 160 ? `${p.description.slice(0, 157)}…` : p.description}
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
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-xl border border-(--card-border) bg-(--bg-secondary)/30 p-3 pb-4">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-xs font-semibold text-(--text-primary)">Job description (optional)</h3>
                    {jdText.trim().length > 0 ? (
                      <span className="text-[10px] font-medium text-(--accent-primary)">Added</span>
                    ) : null}
                  </div>

                  {jdText.trim().length === 0 || jdShowRawEditor ? (
                    <>
                      <textarea
                        value={jdText}
                        maxLength={12000}
                        rows={4}
                        onChange={(e) => {
                          setJdText(e.target.value)
                          setStartError('')
                        }}
                        onBlur={() => {
                          const t = jdText.trim()
                          if (t.length < 24) return
                          const refined = refineJobDescriptionForUi(jdText)
                          if (refined !== jdText) setJdText(refined)
                          setJdShowRawEditor(false)
                          void runJdParse(refined)
                        }}
                        placeholder="Employer job posting (paste or upload)."
                        className="min-h-[5rem] w-full resize-y rounded-lg border border-(--card-border) bg-(--bg-secondary) px-2.5 py-2 text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--accent-primary) focus:outline-none"
                      />
                      {jdShowRawEditor ? (
                        <button
                          type="button"
                          onClick={() => {
                            const refined = refineJobDescriptionForUi(jdText)
                            setJdText(refined)
                            setJdShowRawEditor(false)
                            void runJdParse(refined)
                          }}
                          className="mt-2 text-[10px] font-semibold text-(--accent-primary)"
                        >
                          Done
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <div className="space-y-2">
                      {jdParseStatus === 'parsing' ? (
                        <div className="flex items-start gap-3 rounded-xl border border-(--accent-primary)/30 bg-(--accent-primary)/10 px-3 py-2.5">
                          <span className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-(--accent-primary) border-t-transparent" />
                          <div>
                            <p className="text-xs font-medium text-(--text-primary)">Structuring the posting…</p>
                            <p className="mt-0.5 text-[11px] text-(--text-muted)">
                              Usually takes 10–20 seconds.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={cn(
                            'rounded-xl border p-3 pb-4 sm:p-4',
                            jdParseStatus === 'failed'
                              ? 'border-amber-600/30 bg-[color-mix(in_srgb,var(--accent-warning)_7%,var(--card-bg))] dark:border-amber-500/25'
                              : 'border-emerald-600/25 bg-[color-mix(in_srgb,var(--accent-success)_8%,var(--card-bg))]',
                          )}
                        >
                          <p
                            className={cn(
                              'text-sm font-semibold',
                              jdParseStatus === 'failed'
                                ? 'text-amber-900 dark:text-amber-300'
                                : 'text-emerald-700 dark:text-emerald-400',
                            )}
                          >
                            {jdParseStatus === 'failed' ? 'Employer posting on file' : 'Job description ready'}
                          </p>
                          <p className="mt-1 text-xs text-(--text-muted)">
                            {parsedJd
                              ? jobDescriptionSummaryLine(parsedJd)
                              : jdParseStatus === 'failed'
                                ? 'Structure unavailable — you can edit the text or continue with cleaned posting text.'
                                : 'Structured preview is preparing…'}
                          </p>
                          {jdParseStatus === 'failed' && jdParseError ? (
                            <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-400">{jdParseError}</p>
                          ) : null}
                          {parsedJd ? (
                            <Dialog>
                              <DialogTrigger className="mt-3 w-full rounded-lg border border-(--card-border) bg-(--card-bg) px-3 py-2 text-center text-xs font-semibold text-(--text-primary) shadow-sm transition-colors hover:bg-(--bg-tertiary) sm:w-auto sm:self-start">
                                Preview posting
                              </DialogTrigger>
                              <DialogContent
                                className="flex h-[min(92dvh,44rem)] max-h-[min(92dvh,44rem)] w-[min(calc(100vw-1.25rem),42rem)] max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden rounded-xl border border-(--card-border) bg-(--card-bg) p-0 text-(--text-primary) shadow-xl sm:max-w-3xl"
                                showCloseButton
                              >
                                <DialogHeader className="shrink-0 border-b border-(--card-border) p-4 sm:p-5">
                                  <DialogTitle className="text-base font-semibold text-(--text-primary)">
                                    Job posting
                                  </DialogTitle>
                                  <DialogDescription className="sr-only">
                                    Structured summary of the employer posting for this session.
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-5">
                                  <ParsedJobDescriptionSections parsed={parsedJd} />
                                </div>
                              </DialogContent>
                            </Dialog>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2 sm:gap-2.5">
                            <button
                              type="button"
                              onClick={() => setJdShowRawEditor(true)}
                              className="rounded-lg border border-(--card-border) bg-(--card-bg) px-3 py-1.5 text-[11px] font-semibold text-(--text-primary) hover:bg-(--bg-secondary)"
                            >
                              Edit source text
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setJdText('')
                                setParsedJd(null)
                                setJdParseStatus('idle')
                                setJdParseError('')
                                setJdShowRawEditor(false)
                                setStartError('')
                              }}
                              className="rounded-lg border border-(--card-border) px-3 py-1.5 text-[11px] font-semibold text-(--text-secondary) hover:text-(--text-primary)"
                            >
                              Remove JD
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-lg border border-(--card-border) px-2.5 py-1.5 text-[10px] font-semibold text-(--text-primary) hover:bg-(--bg-secondary)">
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
                      Upload file
                    </label>
                    {jdFile ? (
                      <button
                        type="button"
                        disabled={jdExtractLoading}
                        onClick={() => void handleJdExtract()}
                        className="rounded-lg border border-(--card-border) px-2.5 py-1.5 text-[10px] font-semibold text-(--text-primary) hover:bg-(--bg-secondary) disabled:opacity-50"
                      >
                        {jdExtractLoading ? 'Reading…' : `Extract “${jdFile.name.length > 22 ? `${jdFile.name.slice(0, 19)}…` : jdFile.name}”`}
                      </button>
                    ) : null}
                  </div>
                  {jdExtractLoading ? (
                    <p className="mt-1.5 text-[10px] leading-snug text-(--text-muted)">
                      Reading text from your file — usually a few seconds.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex min-h-0 flex-col gap-3 lg:gap-2">
                <p className="text-center text-[11px] leading-snug text-(--text-muted) sm:text-left lg:text-left">
                  This run:{' '}
                  <span className="font-medium text-(--text-primary)">
                    {difficultyQuestionCount(difficulty)} questions
                  </span>
                  , ~60s each, voice + captions — skips, feedback, then your report.
                </p>

                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-(--card-border) bg-(--bg-secondary)/40 px-3 py-2 lg:py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-(--text-muted)">Level</span>
                  <div className="flex flex-1 flex-wrap gap-1.5">
                    {(['easy', 'medium', 'hard'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          setDifficulty(level)
                          setDifficultyTouched(true)
                          setStartError('')
                        }}
                        className={cn(
                          'rounded-lg border px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors',
                          difficulty === level
                            ? 'border-(--accent-primary) bg-(--accent-primary) text-white'
                            : 'border-(--card-border) bg-(--card-bg) text-(--text-secondary) hover:border-(--accent-primary)/40',
                        )}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                    {difficultyTouched ? (
                      <button
                        type="button"
                        onClick={() => {
                          refreshResolvedPreferences()
                          setDifficulty(readDefaultDifficulty())
                          setDifficultyTouched(false)
                          setStartError('')
                        }}
                        className="text-[10px] font-medium text-(--text-muted) underline hover:text-(--text-primary)"
                      >
                        Match Settings
                      </button>
                    ) : null}
                    <Link
                      href="/settings"
                      className="inline-flex items-center gap-1 rounded-lg border border-(--card-border) bg-(--card-bg) px-2 py-1 text-[10px] font-semibold text-(--text-primary) hover:border-(--accent-primary)/40 hover:text-(--accent-primary)"
                    >
                      <Settings className="size-3 opacity-80" aria-hidden />
                      Settings
                    </Link>
                  </div>
                </div>

                <p className="text-[11px] text-(--text-muted)">
                  Voice: <span className="font-medium text-(--text-primary)">{interviewerName}</span>
                  {voiceIsSettingsDefault ? ' (Settings)' : ' (custom)'} — change on step 1 if needed.
                </p>

                <div className="rounded-xl border border-(--card-border) bg-(--card-bg)/30 p-2.5 lg:p-2">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-(--text-secondary)">
                    Ready in 3 taps
                  </p>
                  <BriefingChecklist compact variant="quick" onAllChecked={setAllChecked} />
                </div>

                {error ? (
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
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-0 shrink-0 space-y-2 border-t border-(--card-border)/80 bg-[color-mix(in_srgb,var(--card-bg)_88%,transparent)] px-4 py-3 text-center sm:px-6 sm:py-3 lg:rounded-b-[inherit]">
            {showSuccess && !allChecked ? (
              <p className="text-center text-xs font-medium text-(--text-muted) sm:text-left">
                Tap the three quick checks on the right to start.
              </p>
            ) : null}
            {startError && <p className="text-xs text-(--accent-danger)">{startError}</p>}
            <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <button
                type="button"
                onClick={handleBack}
                className="text-sm font-medium text-(--text-secondary) transition-colors duration-200 hover:text-(--text-primary)"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => void handleStartInterview()}
                disabled={!canBegin || startLoading}
                className="w-full rounded-xl px-6 py-3.5 text-sm font-bold shadow-lg transition-all duration-200 disabled:cursor-not-allowed sm:min-w-[220px] sm:w-auto enabled:shadow-[0_0_28px_color-mix(in_srgb,var(--accent-primary)_35%,transparent)]"
                style={{
                  background:
                    canBegin && !startLoading
                      ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))'
                      : 'color-mix(in srgb, var(--bg-tertiary) 88%, white 12%)',
                  color: canBegin && !startLoading ? '#FFFFFF' : 'var(--text-secondary)',
                }}
              >
                {startLoading ? 'Starting…' : 'Begin interview'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
