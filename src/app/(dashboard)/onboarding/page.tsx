'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '@/lib/onboarding/store'
import { useOnboardingHydration } from '@/lib/onboarding/hydration-context'
import type { OnboardingHydration } from '@/lib/onboarding/load-hydration'
import { resolveHydratedResumeId } from '@/lib/onboarding/hydration-shared'
import { usePersistOnboardingDraft } from '@/lib/onboarding/use-persist-onboarding-draft'
import { snapshotFromHydration } from '@/lib/onboarding/apply-hydration'
import { shouldSkipJdReparse } from '@/lib/onboarding/jd-parse-guard'
import { OnboardingStepGoalProfile } from '@/components/onboarding/OnboardingStepGoalProfile'
import { OnboardingStepResume } from '@/components/onboarding/OnboardingStepResume'
import { StepIndicator } from '@/components/onboarding/StepIndicator'
import type { InterviewDifficulty, ParsedJobDescription, ParsedResume } from '@/types/app.types'
import { difficultyQuestionCount } from '@/lib/interview/difficulty-question-count'
import { readDefaultDifficulty, readPreferredInterviewerId, readAdaptiveFollowUpEnabled, readCameraInterviewModeEnabled, writeAdaptiveFollowUpEnabled, writeCameraInterviewModeEnabled, resolveSessionBooleanPreference } from '@/lib/settings/client-preferences'
import { useResolvedInterviewSetupPreferences } from '@/lib/interview/use-resolved-interview-setup-preferences'
import { getInterviewerById } from '@/lib/config/interviewers'
import { parseResponseJsonSafe } from '@/lib/http/parse-response-json'
import { fetchMultipartJson } from '@/lib/client/fetch-multipart-json'
import { MULTIPART_UPLOAD_MAX_BYTES } from '@/lib/http/upload-limits'
import { formatResumeUserFacingError } from '@/lib/resume/parse-outcome'
import { refineJobDescriptionForUi } from '@/lib/documents/job-description-clean'
import { cn } from '@/lib/utils'
import { formatParsedJobDescriptionForInterview } from '@/lib/documents/job-description-interview-brief'
import { trackResumeUploadedGa4 } from '@/lib/analytics/funnel-ga4-bridge'
import { unlockAudioForInterview } from '@/lib/voice/audio-gesture'
import {
  runStartInterviewWithTelemetry,
  stashStartupClickMeta,
} from '@/lib/telemetry/interview-startup-telemetry'
import { userFacingInterviewStartError } from '@/lib/interview/active-interview-policy'

const STEP_LABELS = ['You & goal', 'Resume & start']
const TOTAL_STEPS = 2

type ResumeProcessingState = 'idle' | 'uploading' | 'processing' | 'parsed' | 'failed'

type ResumeStatusPayload = {
  resumeId?: string
  status?: string
  error?: string
  ready?: boolean
  parseQuality?: string
  parseWarning?: string
  parsed_data?: ParsedResume
}

const JD_PARSE_MIN_LEN = 40

/** Append short support ref when API returns requestId (production debugging). */
function withRequestRef(msg: string, requestId?: string): string {
  if (!requestId?.trim()) return msg
  return `${msg} Ref: ${requestId.trim()}`
}

type ApiErr = {
  error?: string
  code?: string
  requestId?: string
  userMessage?: string
  suggestion?: string
  extractionWarning?: string
}

type JdParseStatus = 'idle' | 'parsing' | 'ready' | 'failed'

function jdTextNormalized(text: string): string {
  return refineJobDescriptionForUi(text).trim().slice(0, 12_000)
}

function initialJdParsedSource(hydration: OnboardingHydration | null): string | null {
  if (!hydration || hydration.jdParseStatus !== 'ready' || !hydration.parsedJd) return null
  const normalized = jdTextNormalized(hydration.jdText)
  return normalized.length >= JD_PARSE_MIN_LEN ? normalized : null
}

export default function OnboardingPage() {
  const router = useRouter()
  const serverHydration = useOnboardingHydration()
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

  const [step, setStep] = useState<1 | 2>(() => serverHydration?.step ?? 1)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeFileName, setResumeFileName] = useState<string | null>(
    () => serverHydration?.resumeFileName ?? null,
  )
  const [resumeState, setResumeState] = useState<ResumeProcessingState>(
    () => serverHydration?.resumeState ?? 'idle',
  )
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState(() =>
    serverHydration?.resumeState === 'parsed' ? 'Ready for your interview.' : '',
  )
  const [parsedResume, setParsedResume] = useState<ParsedResume | null>(
    () => serverHydration?.parsedResume ?? null,
  )
  const [resumeParseWarning, setResumeParseWarning] = useState('')
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>(
    () => serverHydration?.difficulty ?? readDefaultDifficulty(),
  )
  const [difficultyTouched, setDifficultyTouched] = useState(
    () => serverHydration?.difficultyTouched ?? false,
  )
  const [aiFollowupsEnabled, setAiFollowupsEnabled] = useState(() =>
    resolveSessionBooleanPreference(
      readAdaptiveFollowUpEnabled(),
      serverHydration?.aiFollowupsEnabled,
      serverHydration?.aiFollowupsTouched,
    ),
  )
  const [aiFollowupsTouched, setAiFollowupsTouched] = useState(
    () => serverHydration?.aiFollowupsTouched ?? false,
  )
  const [cameraInterviewModeEnabled, setCameraInterviewModeEnabled] = useState(() =>
    resolveSessionBooleanPreference(
      readCameraInterviewModeEnabled(),
      serverHydration?.cameraInterviewModeEnabled,
      serverHydration?.cameraModeTouched,
    ),
  )
  const [cameraModeTouched, setCameraModeTouched] = useState(
    () => serverHydration?.cameraModeTouched ?? false,
  )
  const [startLoading, setStartLoading] = useState(false)
  const [startError, setStartError] = useState('')
  const [jdText, setJdText] = useState(() => serverHydration?.jdText ?? '')
  const [jdFile, setJdFile] = useState<File | null>(null)
  const [jdExtractLoading, setJdExtractLoading] = useState(false)
  const [parsedJd, setParsedJd] = useState<ParsedJobDescription | null>(
    () => serverHydration?.parsedJd ?? null,
  )
  const [jdParseStatus, setJdParseStatus] = useState<JdParseStatus>(
    () => serverHydration?.jdParseStatus ?? 'idle',
  )
  const [jdParseError, setJdParseError] = useState('')
  const [jdExtractError, setJdExtractError] = useState('')
  const [jdShowRawEditor, setJdShowRawEditor] = useState(false)
  const jdParseSeq = useRef(0)
  /** Normalized JD text last successfully structured — prevents re-parse on refresh. */
  const jdParsedSourceRef = useRef<string | null>(initialJdParsedSource(serverHydration))
  const hydrationApplied = useRef(false)
  const serverHydrationSynced = useRef(false)
  const prevStepRef = useRef<1 | 2>(serverHydration?.step ?? 1)

  const persistEnabled =
    resumeState !== 'uploading' && resumeState !== 'processing'

  const { flushNow } = usePersistOnboardingDraft({
    step,
    data,
    resumeFileName,
    jdText,
    parsedJd,
    jdParseStatus,
    difficulty,
    difficultyTouched,
    aiFollowupsEnabled,
    aiFollowupsTouched,
    cameraInterviewModeEnabled,
    cameraModeTouched,
    enabled: persistEnabled,
  })

  /** Client fallback: re-sync from DB after hard refresh if layout SSR missed (rare). */
  useEffect(() => {
    if (hydrationApplied.current || serverHydration) {
      hydrationApplied.current = true
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/onboarding/state', { credentials: 'include' })
        if (!res.ok || cancelled) return
        const body = (await res.json()) as { hydration?: OnboardingHydration }
        const h = body.hydration
        if (!h || cancelled) return
        const snap = snapshotFromHydration(h)
        setStep(snap.step)
        setResumeFileName(snap.resumeFileName)
        setParsedResume(snap.parsedResume)
        setResumeState(snap.resumeState)
        setJdText(snap.jdText)
        setParsedJd(snap.parsedJd)
        setJdParseStatus(snap.jdParseStatus)
        setDifficulty(snap.difficulty)
        setDifficultyTouched(snap.difficultyTouched)
        setAiFollowupsEnabled(
          resolveSessionBooleanPreference(
            readAdaptiveFollowUpEnabled(),
            snap.aiFollowupsEnabled,
            snap.aiFollowupsTouched,
          ),
        )
        setAiFollowupsTouched(snap.aiFollowupsTouched)
        setCameraInterviewModeEnabled(
          resolveSessionBooleanPreference(
            readCameraInterviewModeEnabled(),
            snap.cameraInterviewModeEnabled,
            snap.cameraModeTouched,
          ),
        )
        setCameraModeTouched(snap.cameraModeTouched)
        if (snap.data.goal != null) setGoal(snap.data.goal)
        setRole(snap.data.role)
        setExperienceYears(snap.data.experienceYears)
        setMode(snap.data.mode)
        if (snap.data.interviewerId != null) setInterviewerId(snap.data.interviewerId)
        if (snap.data.resumeId) setResumeId(snap.data.resumeId)
        if (snap.jdParseStatus === 'ready' && snap.parsedJd) {
          jdParsedSourceRef.current = jdTextNormalized(snap.jdText)
        }
      } catch {
        /* best-effort */
      } finally {
        if (!cancelled) hydrationApplied.current = true
      }
    })()
    return () => {
      cancelled = true
    }
  }, [
    serverHydration,
    setGoal,
    setRole,
    setExperienceYears,
    setMode,
    setInterviewerId,
    setResumeId,
  ])

  /** Sync server hydration into store — draft may omit resumeId while DB resume is parsed. */
  useEffect(() => {
    if (!serverHydration || serverHydrationSynced.current) return
    serverHydrationSynced.current = true

    const h = serverHydration
    const snap = snapshotFromHydration(h)
    if (snap.data.goal != null) setGoal(snap.data.goal)
    setRole(snap.data.role)
    setExperienceYears(snap.data.experienceYears)
    setMode(snap.data.mode)
    if (snap.data.interviewerId != null) setInterviewerId(snap.data.interviewerId)
    if (snap.data.resumeId) setResumeId(snap.data.resumeId)
    if (serverHydration.jdParseStatus === 'ready' && serverHydration.parsedJd) {
      jdParsedSourceRef.current = jdTextNormalized(serverHydration.jdText)
    }
  }, [
    serverHydration,
    setGoal,
    setRole,
    setExperienceYears,
    setMode,
    setInterviewerId,
    setResumeId,
  ])

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

  /** Same-tab Settings edits do not emit `storage`; refresh + re-sync on step 2. */
  useEffect(() => {
    if (step >= 2) refreshResolvedPreferences()
  }, [step, refreshResolvedPreferences])

  useEffect(() => {
    if (step < 2) return
    if (!aiFollowupsTouched) {
      setAiFollowupsEnabled(resolved.adaptiveFollowUpEnabled)
    }
    if (!cameraModeTouched) {
      setCameraInterviewModeEnabled(resolved.cameraInterviewModeEnabled)
    }
  }, [
    step,
    resolved.adaptiveFollowUpEnabled,
    resolved.cameraInterviewModeEnabled,
    aiFollowupsTouched,
    cameraModeTouched,
  ])

  /** Align session prefs with Settings when entering step 2 — not on refresh. */
  useEffect(() => {
    const prev = prevStepRef.current
    prevStepRef.current = step
    if (prev !== 1 || step !== 2) return
    refreshResolvedPreferences()
    if (!difficultyTouched) setDifficulty(readDefaultDifficulty())
    if (!aiFollowupsTouched) setAiFollowupsEnabled(readAdaptiveFollowUpEnabled())
    if (!cameraModeTouched) setCameraInterviewModeEnabled(readCameraInterviewModeEnabled())
  }, [step, difficultyTouched, aiFollowupsTouched, cameraModeTouched, refreshResolvedPreferences])

  const runJdParse = useCallback(async (textOverride?: string) => {
    const source = textOverride ?? jdText
    const base = jdTextNormalized(source)
    if (base.length < JD_PARSE_MIN_LEN) {
      setParsedJd(null)
      setJdParseStatus('idle')
      setJdParseError('')
      jdParsedSourceRef.current = null
      return
    }
    if (
      shouldSkipJdReparse({
        normalizedText: base,
        minLen: JD_PARSE_MIN_LEN,
        parseStatus: jdParseStatus,
        hasParsedJd: parsedJd !== null,
        lastParsedSource: jdParsedSourceRef.current,
      })
    ) {
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
        jdParsedSourceRef.current = base
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
  }, [jdText, jdParseStatus, parsedJd])

  useEffect(() => {
    if (step !== 2 || jdShowRawEditor) return
    const normalized = jdTextNormalized(jdText)
    if (normalized.length < JD_PARSE_MIN_LEN) {
      setParsedJd(null)
      setJdParseStatus('idle')
      setJdParseError('')
      jdParsedSourceRef.current = null
      return
    }
    if (
      shouldSkipJdReparse({
        normalizedText: normalized,
        minLen: JD_PARSE_MIN_LEN,
        parseStatus: jdParseStatus,
        hasParsedJd: parsedJd !== null,
        lastParsedSource: jdParsedSourceRef.current,
      })
    ) {
      return
    }
    const id = window.setTimeout(() => {
      void runJdParse(normalized)
    }, 650)
    return () => window.clearTimeout(id)
  }, [step, jdText, jdShowRawEditor, runJdParse, jdParseStatus, parsedJd])

  useEffect(() => {
    if (!data.resumeId || resumeState !== 'processing') return

    // Exponential backoff: 2s → ~2.8s → ~3.9s → ~5.5s → capped at 8s.
    // Hard limit of 20 polls (~75s total wall time) prevents infinite loops
    // when the backend is stuck. Cleanup cancels any pending timer so
    // navigation/unmount never fires a state update on a torn-down component.
    const INITIAL_DELAY_MS = 2_000
    const BACKOFF_FACTOR   = 1.4
    const MAX_DELAY_MS     = 8_000
    const MAX_POLLS        = 20

    let cancelled  = false
    let attempts   = 0
    let timeoutId: number | null = null

    const schedule = (delayMs: number) => {
      timeoutId = window.setTimeout(() => void poll(delayMs), delayMs) as number
    }

    const poll = async (currentDelay: number) => {
      if (cancelled) return
      attempts++

      // Hard timeout guard — fail safely instead of looping forever.
      if (attempts > MAX_POLLS) {
        if (!cancelled) {
          setResumeState('failed')
          setError(
            'Resume parsing timed out. Please retry — complex resumes occasionally take longer. ' +
            'Shortening your resume or pasting text directly can help.',
          )
        }
        return
      }

      // Progressive status messages as wait time grows.
      if (attempts === 1) {
        setStatusMessage('Analyzing your resume — usually takes 10–20 seconds…')
      } else if (attempts === 5) {
        setStatusMessage('Still working on it — AI parsing can take a moment with longer resumes…')
      } else if (attempts === 10) {
        setStatusMessage('This is taking longer than usual — almost there, hang on…')
      } else if (attempts === 16) {
        setStatusMessage('Parsing is taking longer than expected. You can retry if it seems stuck.')
      }

      try {
        const res = await fetch(
          `/api/resume/status?id=${encodeURIComponent(data.resumeId as string)}`,
          { method: 'GET', credentials: 'include' },
        )
        if (cancelled) return

        const payload = await parseResponseJsonSafe<ResumeStatusPayload>(res)
        if (cancelled) return

        if (!res.ok) {
          setResumeState('failed')
          setError(payload.error ?? 'Unable to check resume status. Please retry.')
          return
        }

        if (payload.status === 'parsed') {
          setResumeState('parsed')
          const warn =
            payload.parseWarning ??
            payload.parsed_data?.parse_warning ??
            ''
          setResumeParseWarning(warn)
          const skills = payload.parsed_data?.skills?.length ?? 0
          const hasProfile = !!(
            payload.parsed_data?.target_role?.trim() || skills >= 2
          )
          setStatusMessage(
            warn && !hasProfile
              ? 'Resume saved — profile may be limited.'
              : 'Ready for your interview.',
          )
          if (payload.parsed_data) setParsedResume(payload.parsed_data)
        } else if (payload.status === 'failed') {
          setResumeState('failed')
          setError(
            'We could not read enough from this resume. Try a text-based PDF, a .txt export, or a clearer file.',
          )
        } else {
          // Still processing — schedule next poll with capped backoff delay.
          const nextDelay = Math.min(currentDelay * BACKOFF_FACTOR, MAX_DELAY_MS)
          schedule(nextDelay)
        }
      } catch {
        if (cancelled) return
        setResumeState('failed')
        setError('Network issue while checking resume status. Please check your connection and retry.')
      }
    }

    schedule(INITIAL_DELAY_MS)

    return () => {
      cancelled = true
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }
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
    setResumeParseWarning('')
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
        const uploadMsg = formatResumeUserFacingError(result)
        setError(
          withRequestRef(
            uploadMsg ||
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
      trackResumeUploadedGa4(result.resumeId, { source: 'onboarding' })
      setResumeFileName(resumeFile.name)
      setResumeData({ resumeText: '', skills: [], projects: [] })
      if (result.extractionWarning) {
        setResumeParseWarning(result.extractionWarning)
      }

      // Enter the processing state first so the poll below drives progressive
      // status messages and remains the completion source of truth.
      setResumeState('processing')
      setStatusMessage('Analyzing your resume — usually takes 10–20 seconds…')

      // Drive the parse EXPLICITLY (was fire-and-forget). `/api/resume/parse`
      // parses synchronously and returns the authoritative outcome, so awaiting
      // it lets us surface a parse FAILURE immediately with a retry path —
      // instead of silently waiting out the full status-poll timeout when the
      // parse never started (audit P1 #6: "fire-and-forget resume parse").
      // Bounded by an AbortController so a dead mobile connection can't hang.
      const parseController = new AbortController()
      const parseTimeout = window.setTimeout(() => parseController.abort(), 65_000)
      try {
        const parseRes = await fetch('/api/resume/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ resumeId: result.resumeId }),
          signal: parseController.signal,
        })
        if (!parseRes.ok) {
          const perr = await parseResponseJsonSafe<ApiErr>(parseRes)
          setResumeState('failed')
          setError(
            withRequestRef(
              (typeof perr.userMessage === 'string' && perr.userMessage) ||
                perr.error ||
                'We could not analyze this resume. Try a text-based PDF, a .txt export, or paste the text directly.',
              perr.requestId,
            ),
          )
          return
        }
        // Success — the status poll (already running) will fetch parsed_data and
        // any parse warning, then flip to 'parsed'.
      } catch (parseErr) {
        // The parse request never reached a verdict (network drop / timeout).
        // The status poll cannot recover a parse that never ran, so fail
        // explicitly with a retry rather than spinning until the poll cap.
        const aborted = parseErr instanceof DOMException && parseErr.name === 'AbortError'
        setResumeState('failed')
        setError(
          aborted
            ? 'Resume analysis timed out. Please retry — a shorter resume or pasted text can help.'
            : 'Could not start resume analysis. Check your connection and retry.',
        )
        return
      } finally {
        window.clearTimeout(parseTimeout)
      }
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
    setResumeParseWarning('')
    setResumeState('idle')
    setResumeFileName(null)
    setJdExtractError('')
  }

  const handleNext = async () => {
    await flushNow()
    if (step < TOTAL_STEPS) setStep(2)
  }

  const handleBack = async () => {
    await flushNow()
    if (step > 1) setStep(1)
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

  const showSuccess = resumeState === 'parsed'

  const effectiveResumeId =
    data.resumeId ??
    resolveHydratedResumeId(
      serverHydration?.draft ?? null,
      serverHydration?.resume ?? null,
      serverHydration?.data.resumeId,
    )

  const handleStartInterview = async () => {
    if (startLoading) return
    setStartLoading(true)
    setStartError('')

    if (!effectiveResumeId || !data.goal || !data.interviewerId) {
      setStartError('Missing setup data. Please complete all steps.')
      setStartLoading(false)
      return
    }

    if (!data.resumeId && effectiveResumeId) {
      setResumeId(effectiveResumeId)
    }

    const result = await runStartInterviewWithTelemetry({
      unlockAudio: unlockAudioForInterview,
      createSession: async () => {
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
              return {
                ok: false,
                error:
                  vd.error ??
                  'Job description does not look like a valid JD. Fix it or clear the field.',
              }
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
              resumeId: effectiveResumeId,
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
              followUpEnabled: aiFollowupsEnabled,
              ...(jobDescription ? { jobDescription } : {}),
            }),
          })

          const responseData = (await response.json().catch(() => null)) as {
            interviewId?: string
            error?: string
            preparing?: boolean
            resumeUrl?: string
          } | null

          if (response.status === 405) {
            return { ok: false, error: 'Internal API mismatch. Please contact support.' }
          }

          if (response.status === 409 && responseData?.error === 'active_interview') {
            if (responseData.interviewId || (responseData.resumeUrl && responseData.resumeUrl !== '/dashboard')) {
              return {
                ok: true,
                interviewId: responseData.interviewId,
                preparing: responseData.preparing ?? false,
                resumeUrl: responseData.resumeUrl,
              }
            }
            return { ok: false, error: userFacingInterviewStartError(409, responseData.error) }
          }

          if (!response.ok || !responseData?.interviewId) {
            return {
              ok: false,
              error: userFacingInterviewStartError(
                response.status,
                responseData?.error,
              ),
            }
          }

          return {
            ok: true,
            interviewId: responseData.interviewId,
            preparing: responseData.preparing ?? false,
          }
        } catch (err: unknown) {
          const msg =
            err instanceof Error ? err.message : 'Failed to start interview. Please try again.'
          return { ok: false, error: msg }
        }
      },
    })

    if (!result.ok) {
      setStartError(result.error ?? 'Failed to start interview. Please try again.')
      setStartLoading(false)
      return
    }

    const dest =
      result.resumeUrl?.trim() ||
      (result.interviewId
        ? `/interview/session/${result.interviewId}?interviewer=${data.interviewerId}`
        : '')
    if (!dest || dest === '/dashboard') {
      setStartError('You already have an active interview. Open it from your dashboard.')
      setStartLoading(false)
      return
    }

    void fetch('/api/onboarding/state', { method: 'DELETE', credentials: 'include' })

    if (result.interviewId) stashStartupClickMeta(result.interviewId)
    const prepQ = result.preparing
      ? dest.includes('?')
        ? '&preparing=1'
        : '?preparing=1'
      : ''
    router.push(`${dest}${prepQ}`)
    setStartLoading(false)
  }

  const canBegin =
    showSuccess &&
    data.goal !== null &&
    effectiveResumeId !== null &&
    data.interviewerId !== null

  const interviewerName = getInterviewerById(data.interviewerId)?.name ?? resolved.interviewerName
  const voiceIsSettingsDefault = data.interviewerId === resolved.interviewerId

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-1.5 overflow-x-hidden pb-4 max-lg:pb-6 lg:max-h-full lg:min-h-0 lg:max-w-6xl lg:flex-1 lg:gap-1.5 lg:overflow-hidden lg:pb-0">
      <div
        className={cn(
          'flex shrink-0 flex-col items-center gap-1.5 text-center sm:gap-2',
          step === 2 && 'lg:gap-1',
        )}
      >
        <div className="min-w-0 max-w-lg">
          <h1
            className={cn(
              'font-bold tracking-tight text-(--text-primary)',
              step === 2
                ? 'text-xl sm:text-2xl lg:text-lg lg:leading-snug'
                : 'text-2xl sm:text-3xl lg:text-xl lg:leading-snug',
            )}
          >
            Set Up Your Interview
          </h1>
          {step === 1 ? (
            <p className="mt-0.5 text-sm font-medium leading-snug text-(--text-secondary) sm:text-base lg:mt-1 lg:text-xs lg:leading-snug">
              Two quick steps — same path every time so practice stays frictionless.
            </p>
          ) : null}
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
          resumeFileName={resumeFileName}
          resumeState={resumeState}
          statusMessage={statusMessage}
          parsedResume={parsedResume}
          resumeParseWarning={resumeParseWarning}
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
            const refined = refineJobDescriptionForUi(jdText)
            const normalized = jdTextNormalized(refined)
            if (normalized.length < 24) return
            if (refined !== jdText) setJdText(refined)
            setJdShowRawEditor(false)
            if (
              shouldSkipJdReparse({
                normalizedText: normalized,
                minLen: JD_PARSE_MIN_LEN,
                parseStatus: jdParseStatus,
                hasParsedJd: parsedJd !== null,
                lastParsedSource: jdParsedSourceRef.current,
              })
            ) {
              return
            }
            void runJdParse(normalized)
          }}
          onJdClear={() => {
            setJdText('')
            setParsedJd(null)
            setJdParseStatus('idle')
            setJdParseError('')
            setJdExtractError('')
            setJdShowRawEditor(false)
            setStartError('')
            jdParsedSourceRef.current = null
          }}
          difficulty={difficulty}
          difficultyTouched={difficultyTouched}
          questionCount={difficultyQuestionCount(difficulty)}
          onDifficultyChange={(d) => { setDifficulty(d); setDifficultyTouched(true); setStartError('') }}
          onMatchDifficultySettings={() => { refreshResolvedPreferences(); setDifficulty(readDefaultDifficulty()); setDifficultyTouched(false); setStartError('') }}
          aiFollowupsEnabled={aiFollowupsEnabled}
          aiFollowupsTouched={aiFollowupsTouched}
          cameraInterviewModeEnabled={cameraInterviewModeEnabled}
          cameraModeTouched={cameraModeTouched}
          onAiFollowupsChange={(enabled) => {
            setAiFollowupsEnabled(enabled)
            setAiFollowupsTouched(true)
            writeAdaptiveFollowUpEnabled(enabled)
            setStartError('')
          }}
          onCameraModeChange={(enabled) => {
            setCameraInterviewModeEnabled(enabled)
            setCameraModeTouched(true)
            writeCameraInterviewModeEnabled(enabled)
            setStartError('')
          }}
          onMatchAiFollowupsSettings={() => {
            refreshResolvedPreferences()
            setAiFollowupsEnabled(readAdaptiveFollowUpEnabled())
            setAiFollowupsTouched(false)
            setStartError('')
          }}
          onMatchCameraModeSettings={() => {
            refreshResolvedPreferences()
            setCameraInterviewModeEnabled(readCameraInterviewModeEnabled())
            setCameraModeTouched(false)
            setStartError('')
          }}
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
