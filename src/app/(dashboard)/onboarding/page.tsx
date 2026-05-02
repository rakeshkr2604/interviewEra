'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { useOnboarding } from '@/lib/onboarding/store'
import { GoalSelector } from '@/components/onboarding/GoalSelector'
import { OnboardingStepIllustration } from '@/components/onboarding/OnboardingStepIllustration'
import { StepIndicator } from '@/components/onboarding/StepIndicator'
import type { InterviewGoal } from '@/types/onboarding.types'
import { FaUserTie, FaBriefcase, FaFileUpload } from 'react-icons/fa'

const STEP_LABELS = ['Goal', 'Details', 'Resume']

/** One-tap fills Target role — users can still edit after */
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

export default function OnboardingPage() {
  const router = useRouter()
  const { data, setGoal, setRole, setExperience, setMode, setResumeId, setResumeData } = useOnboarding()
  const [step, setStep] = useState(1)
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeState, setResumeState] = useState<ResumeProcessingState>('idle')
  const [loading] = useState(false)
  const [error, setError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  const canProceedStep1 = data.goal !== null
  const canProceedStep2 = data.role.trim().length > 0 && data.experience.trim().length > 0
  const canProceedStep3 = resumeState === 'parsed'

  useEffect(() => {
    if (!data.resumeId || resumeState !== 'processing') return

    const intervalId = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/resume/status?id=${encodeURIComponent(data.resumeId as string)}`, {
          method: 'GET',
        })

        const payload = (await res.json()) as { status?: string; error?: string }
        if (!res.ok) {
          setResumeState('failed')
          setError(payload.error ?? 'Unable to check resume status. Please retry.')
          window.clearInterval(intervalId)
          return
        }

        if (payload.status === 'parsed') {
          setResumeState('parsed')
          setStatusMessage('Resume parsed successfully. You can continue now.')
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
      setResumeData({
        resumeText: '',
        skills: result.parsedSummary?.skills ?? [],
        projects: [],
      })

      setResumeState('processing')
      setStatusMessage('Processing your resume... this may take a few seconds')

      const statusRes = await fetch(`/api/resume/status?id=${encodeURIComponent(result.resumeId)}`, {
        method: 'GET',
      })
      const statusPayload = (await statusRes.json()) as { status?: string; error?: string }

      if (!statusRes.ok) {
        setResumeState('failed')
        setError(statusPayload.error ?? 'Unable to verify resume status. Please retry.')
        return
      }

      if (statusPayload.status === 'parsed') {
        setResumeState('parsed')
        setStatusMessage('Resume parsed successfully. You can continue now.')
        return
      }

      if (statusPayload.status === 'failed') {
        setResumeState('failed')
        setError('Resume parsing failed. Please retry.')
        return
      }

      setResumeState('processing')
    } catch {
      setResumeState('failed')
      setError('Resume upload failed. Please try again.')
    }
  }

  const handleRetry = () => {
    setError('')
    setStatusMessage('')
    setResumeState('idle')
  }

  const handleNext = () => {
    if (step < 3) {
      setStep(s => s + 1)
      return
    }
    if (!canProceedStep3) {
      return
    }
    router.push('/onboarding/avatar')
  }

  const isProcessing = resumeState === 'uploading' || resumeState === 'processing'
  const showSuccess = resumeState === 'parsed'

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8 sm:py-12 lg:py-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 sm:gap-10 lg:flex-row lg:items-center lg:gap-12 xl:gap-16">
        {/* Illustration: vertically centered with form on lg; stacks first on mobile */}
        <div className="flex w-full shrink-0 justify-center lg:max-w-[min(100%,420px)] xl:max-w-[min(100%,480px)]">
          <OnboardingStepIllustration key={step} step={step} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full min-w-0 lg:max-w-2xl lg:flex-1 xl:max-w-[44rem]"
        >
          {/* Header */}
          <div className="mb-6 text-center sm:mb-8 lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-(--text-primary) sm:text-4xl">
              Set Up Your Interview
            </h1>
            <p className="mt-2 text-base font-medium leading-snug text-(--text-primary) sm:text-lg">
              About a minute of setup — then practice that actually moves the needle.
            </p>
            <p className="mt-1.5 text-sm text-(--text-secondary)">
              You’ve got this. Each step makes the next session sharper.
            </p>
          </div>

          {/* Step Indicator */}
          <div className="mb-8">
            <StepIndicator currentStep={step} totalSteps={3} labels={STEP_LABELS} />
          </div>

          {/* Card */}
          <div className="dashboard-premium-card p-8 sm:p-10">

          {/* STEP 1 — Goal */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-xl font-semibold text-(--text-primary)">
                  What is your goal?
                </h2>
                <p className="mt-1 text-sm text-(--text-secondary)">
                  We will personalize your questions based on this.
                </p>
              </div>
              <GoalSelector
                selected={data.goal}
                onSelect={(g: InterviewGoal) => setGoal(g)}
              />
            </motion.div>
          )}

          {/* STEP 2 — Details */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-(--text-primary)">
                  Tell us about yourself
                </h2>
                <p className="mt-1 text-sm text-(--text-secondary)">
                  Used to generate role-specific questions.
                </p>
              </div>

              {/* Role — icon only wraps input so it stays vertically centered on the field */}
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
                    onChange={e => setRole(e.target.value)}
                    className="w-full rounded-xl border border-(--card-border)
                               bg-(--bg-secondary) py-3 pl-11 pr-4
                               text-(--text-primary) placeholder:text-(--text-muted)
                               focus:border-(--accent-primary) focus:outline-none
                               transition-colors duration-200"
                  />
                </div>
                <p className="text-xs text-(--text-muted)">Quick pick — tap to fill</p>
                <div
                  className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                  role="group"
                  aria-label="Suggested roles"
                >
                  {ROLE_QUICK_PICKS.map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setRole(role)}
                      className={`min-h-[2.25rem] w-full rounded-full border px-2 py-1.5 text-center text-xs font-medium
                                  leading-snug transition-colors duration-200 sm:px-3
                                  ${data.role === role
                                    ? 'border-(--accent-primary) bg-(--accent-primary)/10 text-(--accent-primary)'
                                    : 'border-(--card-border) bg-(--card-bg) text-(--text-secondary) hover:border-(--accent-primary)/45 hover:text-(--text-primary)'}`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience */}
              <div className="relative">
                <FaBriefcase className="absolute left-4 top-1/2 -translate-y-1/2
                                         text-(--text-muted)" />
                <input
                  type="text"
                  placeholder="Experience (e.g. Fresher or 2 years)"
                  value={data.experience}
                  onChange={e => setExperience(e.target.value)}
                  className="w-full rounded-xl border border-(--card-border)
                             bg-(--bg-secondary) py-3 pl-11 pr-4
                             text-(--text-primary) placeholder:text-(--text-muted)
                             focus:border-(--accent-primary) focus:outline-none
                             transition-colors duration-200"
                />
              </div>

              {/* Mode */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-(--text-secondary)">
                  Interview Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['Technical', 'HR'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`rounded-xl border py-3 text-sm font-semibold
                                  transition-all duration-200
                                  ${data.mode === m
                                    ? 'border-(--accent-primary) bg-(--accent-primary)/10 text-(--accent-primary)'
                                    : 'border-(--card-border) bg-(--bg-secondary) text-(--text-secondary)'
                                  }`}
                    >
                      {m === 'Technical' ? '💻 Technical' : '🤝 HR / Behavioral'}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3 — Resume */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-semibold text-(--text-primary)">
                  Upload your resume
                </h2>
                <p className="mt-1 text-sm text-(--text-secondary)">
                  Required for personalized interview generation.
                </p>
              </div>

              {!showSuccess && (
                <div>
                  <label
                    htmlFor="resumeUpload"
                    className="flex cursor-pointer flex-col items-center
                               justify-center gap-3 rounded-2xl border-2 border-dashed
                               border-(--card-border) p-8 text-center
                               hover:border-(--accent-primary)/50
                               transition-colors duration-200"
                  >
                    <FaFileUpload className="text-3xl text-(--accent-primary)" />
                    <span className="text-sm text-(--text-secondary)">
                      {resumeFile ? resumeFile.name : 'Click to upload PDF/TXT resume'}
                    </span>
                    <input
                      id="resumeUpload"
                      type="file"
                      accept=".pdf,.txt"
                      className="hidden"
                      onChange={e => {
                        setResumeFile(e.target.files?.[0] ?? null)
                        setError('')
                        setStatusMessage('')
                        if (resumeState === 'failed') setResumeState('idle')
                      }}
                      disabled={isProcessing}
                    />
                  </label>

                  {resumeFile && (
                    <button
                      onClick={handleUploadResume}
                      disabled={isProcessing}
                      className="mt-3 w-full rounded-xl border border-(--card-border)
                                 bg-(--bg-secondary) py-2.5 text-sm font-semibold
                                 text-(--text-primary) transition-colors duration-200
                                 hover:bg-(--bg-tertiary) disabled:opacity-50"
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
                <div className="rounded-2xl border border-(--accent-primary)/30 bg-(--accent-primary)/10 p-4">
                  <div className="flex items-center gap-3">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-(--accent-primary) border-t-transparent" />
                    <p className="text-sm text-(--text-primary)">
                      Processing your resume... this may take a few seconds
                    </p>
                  </div>
                </div>
              )}

              {showSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-(--accent-success)/30
                             bg-(--accent-success)/10 p-4 space-y-3"
                >
                  <p className="text-sm font-semibold text-(--accent-success)">
                    ✅ {statusMessage || 'Resume parsed successfully. You can continue now.'}
                  </p>
                  {data.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {data.skills.slice(0, 8).map(s => (
                        <span key={s}
                              className="rounded-full border border-(--accent-success)/20
                                         bg-(--accent-success)/10 px-3 py-1
                                         text-xs text-(--accent-success)">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {error && (
                <div className="space-y-2">
                  <p className="text-sm text-(--accent-danger)">{error}</p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="rounded-lg border border-(--card-border) px-3 py-2 text-xs font-semibold text-(--text-primary) hover:bg-(--bg-secondary)"
                  >
                    Retry
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            {step > 1 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="text-sm text-(--text-secondary) hover:text-(--text-primary)
                           transition-colors duration-200"
              >
                ← Back
              </button>
            ) : <div />}

            <button
              onClick={handleNext}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3) ||
                loading
              }
              className="rounded-xl bg-(--accent-primary) px-8 py-3
                         text-sm font-semibold text-white shadow-lg
                         hover:bg-(--accent-hover) transition-colors duration-200
                         disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {step === 3 ? 'Choose Your Interviewer →' : 'Continue →'}
            </button>
          </div>
        </div>
        </motion.div>
      </div>
    </div>
  )
}
