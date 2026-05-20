'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/lib/onboarding/store'
import { OnboardingStepGoalProfile } from '@/components/onboarding/OnboardingStepGoalProfile'
import { OnboardingStepResume } from '@/components/onboarding/OnboardingStepResume'
import { StepIndicator } from '@/components/onboarding/StepIndicator'
import type { InterviewDifficulty, ParsedJobDescription, ParsedResume } from '@/types/app.types'
import { difficultyQuestionCount } from '@/lib/interview/difficulty-question-count'
import { readDefaultDifficulty, readPreferredInterviewerId } from '@/lib/settings/client-preferences'
import { useResolvedInterviewSetupPreferences } from '@/lib/interview/use-resolved-interview-setup-preferences'
import { getInterviewerById } from '@/lib/config/interviewers'
import { parseResponseJsonSafe } from '@/lib/http/parse-response-json'
import { fetchMultipartJson } from '@/lib/client/fetch-multipart-json'
import { MULTIPART_UPLOAD_MAX_BYTES } from '@/lib/http/upload-limits'
import { refineJobDescriptionForUi } from '@/lib/documents/job-description-clean'
import { formatParsedJobDescriptionForInterview } from '@/lib/documents/job-description-interview-brief'

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

/** Append short support ref when API returns requestId (production debugging). */
function withRequestRef(msg: string, requestId?: string): string {
  if (!requestId?.trim()) return msg
  return `${msg} Ref: ${requestId.trim()}`
}

type ApiErr = { error?: string; code?: string; requestId?: string }

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
  const [startLoading, setStartLoading] = useState(false)
  const [startError, setStartError] = useState('')
  const [jdText, setJdText] = useState('')
  const [jdFile, setJdFile] = useState<File | null>(null)
  const [jdExtractLoading, setJdExtractLoading] = useState(false)
  const [parsedJd, setParsedJd] = useState<ParsedJobDescription | null>(null)
  const [jdParseStatus, setJdParseStatus] = useState<JdParseStatus>('idle')
  const [jdParseError, setJdParseError] = useState('')
  const [jdExtractError, setJdExtractError] = useState('')
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
      const data = await parseResponseJsonSafe<{ parsed?: ParsedJobDescription; error?: string }>(res)
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
    if (resumeFile.size > MULTIPART_UPLOAD_MAX_BYTES) {
      setResumeState('failed')
      setError(
        `This file is too large (max ${String(Math.floor(MULTIPART_UPLOAD_MAX_BYTES / (1024 * 1024)))} MB). Try a smaller PDF or a .txt resume.`,
      )
      return
    }
    setResumeState('uploading')
    setError('')
    setParsedResume(null)
    setStatusMessage('Sending your file securely…')

    try {
      const formData = new FormData()
      formData.append('file', resumeFile)

      const { ok, status, data: result, requestId: reqIdMeta } = await fetchMultipartJson<ApiErr & { resumeId?: string }>(
        '/api/resume/upload',
        formData,
      )

      if (!ok) {
        setResumeState('failed')
        const rid = reqIdMeta ?? result.requestId
        if (status === 413) {
          setError(withRequestRef('Upload was rejected as too large. Use a file under 4 MB or paste text.', rid))
          return
        }
        if (result.code === 'STORAGE_FAILED') {
          setError(
            withRequestRef(
              result.error ?? 'We could not save your file to storage. If you just deployed, apply the Supabase migration for the resumes bucket and confirm the service role key on Vercel.',
              rid,
            ),
          )
          return
        }
        if (
          result.code === 'SERVER_CONFIG' ||
          result.code === 'MISSING_SERVICE_CONFIG' ||
          result.code === 'ENV_MISSING' ||
          result.code === 'SERVICE_CLIENT_ERROR'
        ) {
          setError(
            withRequestRef(
              result.error ?? 'Upload service is temporarily unavailable. Please try again later.',
              rid,
            ),
          )
          return
        }
        if (result.code === 'USER_PROFILE_MISSING') {
          setError(
            withRequestRef(
              result.error ??
                'Your account is still syncing. Sign out, sign in again, then retry the upload.',
              rid,
            ),
          )
          return
        }
        if (result.code === 'FK_VIOLATION') {
          setError(
            withRequestRef(
              result.error ??
                'Your session is out of sync with our database. Sign out and sign in again, then retry.',
              rid,
            ),
          )
          return
        }
        if (result.code === 'FILE_TOO_LARGE') {
          setError(withRequestRef(result.error ?? 'File too large.', rid))
          return
        }
        setError(
          withRequestRef(
            result.error ??
              (status === 401
                ? 'Your session expired. Refresh the page and sign in again.'
                : status === 429
                  ? 'Too many uploads. Please wait a minute and try again.'
                  : status >= 500
                    ? 'Our servers could not finish the upload. Please try again in a moment.'
                    : 'Resume upload failed. Please try again.'),
            rid,
          ),
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
        credentials: 'include',
        body: JSON.stringify({ resumeId: result.resumeId }),
      })

      setResumeState('processing')
      setStatusMessage('Analyzing your resume — usually takes 10–20 seconds…')
    } catch (e) {
      setResumeState('failed')
      setError('Could not reach the server. Check your connection and try again.')
      if (process.env.NODE_ENV === 'development') console.warn('[onboarding] resume upload', e)
    }
  }

  const handleRetry = () => {
    setError('')
    setStatusMessage('')
    setParsedResume(null)
    setResumeState('idle')
    setJdExtractError('')
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
    setJdExtractError('')
    setStartError('')
    try {
      const fd = new FormData()
      fd.append('file', jdFile)
      const { ok, status, data: payload, requestId: reqIdMeta } = await fetchMultipartJson<ApiErr & { text?: string }>(
        '/api/job-description/extract',
        fd,
      )

      if (!ok) {
        const rid = reqIdMeta ?? payload.requestId
        if (status === 413) {
          setJdExtractError(withRequestRef('This file is too large to upload (max 4 MB). Paste the text instead.', rid))
          return
        }
        setJdExtractError(
          withRequestRef(
            payload.error ??
              (status === 401
                ? 'Your session expired. Refresh the page and sign in again.'
                : status === 429
                  ? 'Too many requests. Please wait a minute.'
                  : payload.code === 'WRONG_DOCUMENT_TYPE'
                    ? 'This file does not look like a job description. Paste the posting text or use a JD PDF.'
                    : 'Could not read this file. Try pasting the job text, or use a .txt export.'),
            rid,
          ),
        )
        return
      }
      if (payload.text) {
        setJdText(payload.text)
        setJdShowRawEditor(false)
      }
      setJdFile(null)
    } catch (e) {
      setJdExtractError('Could not read the job description file. Check your connection and try again.')
      if (process.env.NODE_ENV === 'development') console.warn('[onboarding] JD extract', e)
    } finally {
      setJdExtractLoading(false)
    }
  }

  const handleStartInterview = async () => {
    if (startLoading) return
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
          credentials: 'include',
          body: JSON.stringify({ text: jdTrim.slice(0, 12_000) }),
        })
        const vd = await parseResponseJsonSafe<{ error?: string; text?: string }>(vr)
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

      const interviewMode =
        data.mode === 'HR'
          ? 'hr_behavioral'
          : data.mode === 'Mixed'
            ? 'mixed'
            : 'technical'
      const response = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          resumeId: data.resumeId,
          role: data.role.trim(),
          difficulty,
          interviewerId: data.interviewerId,
          goal: data.goal,
          interviewMode,
          experienceYears:
            typeof data.experienceYears === 'number' &&
            Number.isFinite(data.experienceYears)
              ? Math.trunc(data.experienceYears)
              : 0,
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

  const showSuccess = resumeState === 'parsed'

  const canBegin =
    showSuccess && data.goal !== null && data.resumeId !== null && data.interviewerId !== null

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
        <OnboardingStepResume
          data={data}
          interviewerName={interviewerName}
          resumeFile={resumeFile}
          resumeState={resumeState}
          statusMessage={statusMessage}
          parsedResume={parsedResume}
          error={error}
          onResumeFileChange={(file) => {
            if (!file) return
            setResumeFile(file)
            setError('')
            setStatusMessage('')
            if (resumeState === 'failed') setResumeState('idle')
          }}
          onUploadResume={() => void handleUploadResume()}
          onRetry={handleRetry}
          jdText={jdText}
          jdFile={jdFile}
          jdExtractLoading={jdExtractLoading}
          jdExtractError={jdExtractError}
          jdParseStatus={jdParseStatus}
          jdParseError={jdParseError}
          jdShowRawEditor={jdShowRawEditor}
          parsedJd={parsedJd}
          onJdTextChange={(t) => { setJdText(t); setStartError(''); setJdExtractError('') }}
          onJdFileChange={(f) => { setJdFile(f); setStartError(''); setJdExtractError('') }}
          onJdExtract={() => void handleJdExtract()}
          onJdShowRawEditor={setJdShowRawEditor}
          onJdBlur={() => {
            const t = jdText.trim()
            if (t.length < 24) return
            const refined = refineJobDescriptionForUi(jdText)
            if (refined !== jdText) setJdText(refined)
            setJdShowRawEditor(false)
            void runJdParse(refined)
          }}
          onJdClear={() => { setJdText(''); setParsedJd(null); setJdParseStatus('idle'); setJdParseError(''); setJdExtractError(''); setJdShowRawEditor(false); setStartError('') }}
          difficulty={difficulty}
          difficultyTouched={difficultyTouched}
          questionCount={difficultyQuestionCount(difficulty)}
          onDifficultyChange={(d) => { setDifficulty(d); setDifficultyTouched(true); setStartError('') }}
          onMatchDifficultySettings={() => { refreshResolvedPreferences(); setDifficulty(readDefaultDifficulty()); setDifficultyTouched(false); setStartError('') }}
          canBegin={canBegin}
          startLoading={startLoading}
          startError={startError}
          onBack={handleBack}
          onStartInterview={() => void handleStartInterview()}
          onEditGoalAndVoice={() => { setStartError(''); setStep(1) }}
        />
      )}
    </div>
  )
}
