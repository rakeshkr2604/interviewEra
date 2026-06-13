'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Link from 'next/link'
import { ParsedJobDescriptionSections } from '@/components/onboarding/ParsedJobDescriptionSections'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { jobDescriptionSummaryLine } from '@/lib/onboarding/job-description-summary-line'
import { refineJobDescriptionForUi } from '@/lib/documents/job-description-clean'
import type { ParsedJobDescription, ParsedResume, InterviewDifficulty } from '@/types/app.types'
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume'
import type { OnboardingData } from '@/types/onboarding.types'
import type { LucideIcon } from 'lucide-react'
import {
  FileUp,
  FileText,
  CheckCircle2,
  Lock,
  User,
  Brain,
  Gauge,
  MessageSquare,
  Clock,
  Mic,
  Sparkles,
  Settings,
  RotateCcw,
  Rocket,
  ChevronLeft,
  Mic2,
  Target,
  AlertCircle,
  Eye,
  Pencil,
  X,
} from 'lucide-react'

// ─── Local types (match page.tsx) ────────────────────────────────────────────

export type ResumeProcessingState = 'idle' | 'uploading' | 'processing' | 'parsed' | 'failed'
export type JdParseStatus         = 'idle' | 'parsing'  | 'ready'     | 'failed'

export interface OnboardingStepResumeProps {
  // Onboarding context
  data:             OnboardingData
  interviewerName:  string

  // Resume
  resumeFile:       File | null
  /** Persisted display name when resumeFile is null after refresh. */
  resumeFileName:   string | null
  resumeState:      ResumeProcessingState
  statusMessage:    string
  parsedResume:     ParsedResume | null
  resumeParseWarning?: string
  error:            string
  onResumeFileChange: (file: File | null) => void
  onUploadResume:   () => void
  onRetry:          () => void

  // Job description
  jdText:           string
  jdFile:           File | null
  jdExtractLoading: boolean
  jdExtractError:   string
  jdParseStatus:    JdParseStatus
  jdParseError:     string
  jdShowRawEditor:  boolean
  parsedJd:         ParsedJobDescription | null
  onJdTextChange:   (text: string) => void
  onJdFileChange:   (file: File | null) => void
  onJdExtract:      () => void
  onJdShowRawEditor:(show: boolean) => void
  onJdBlur:         () => void
  onJdClear:        () => void

  // Difficulty
  difficulty:              InterviewDifficulty
  difficultyTouched:       boolean
  questionCount:           number
  onDifficultyChange:      (d: InterviewDifficulty) => void
  onMatchDifficultySettings: () => void

  // CTA / navigation
  canBegin:          boolean
  startLoading:      boolean
  startError:        string
  onBack:            () => void
  onStartInterview:  () => void
  onEditGoalAndVoice:() => void
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SessionRow({
  icon: Icon,
  label,
  value,
  accent,
  compact = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  accent?: boolean
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b border-(--card-border)/50 last:border-0',
        compact ? 'py-1.5' : 'gap-3 py-2.5',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-md bg-(--accent-primary)/10',
          compact ? 'size-6' : 'size-7 rounded-lg',
        )}
      >
        <Icon className={cn('text-(--accent-primary)', compact ? 'size-3' : 'size-3.5')} aria-hidden />
      </div>
      <p className={cn('shrink-0 text-(--text-muted)', compact ? 'w-14 text-[10px]' : 'w-20 text-[11px]')}>
        {label}
      </p>
      <p
        className={cn(
          'min-w-0 flex-1 truncate font-semibold',
          compact ? 'text-[12px]' : 'text-[13px]',
          accent ? 'text-(--accent-primary)' : 'text-(--text-primary)',
        )}
      >
        {value}
      </p>
    </div>
  )
}

function UploadZone({
  resumeFile,
  isDragOver,
  isDisabled,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  resumeFile: File | null
  isDragOver: boolean
  isDisabled: boolean
  onFileChange: (f: File | null) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
}) {
  return (
    <label
      htmlFor="resumeUpload"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'relative flex cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-7 text-center transition-all duration-200',
        isDragOver
          ? 'border-(--accent-primary) bg-(--accent-primary)/8 scale-[1.01]'
          : 'border-(--card-border) bg-(--bg-secondary)/40 hover:border-(--accent-primary)/55 hover:bg-(--accent-primary)/5',
      )}
    >
      {/* Icon tile */}
      <motion.div
        animate={isDragOver ? { scale: 1.1, rotate: -5 } : { scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="flex size-14 items-center justify-center rounded-2xl border border-(--accent-primary)/25 bg-(--accent-primary)/10"
      >
        <FileUp className="size-7 text-(--accent-primary)" aria-hidden />
      </motion.div>

      {/* Copy */}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-(--text-primary)">
          {resumeFile ? resumeFile.name : isDragOver ? 'Release to upload' : 'Drop your resume here'}
        </p>
        <p className="text-xs text-(--text-secondary)">
          {resumeFile ? 'Ready to upload' : 'or click to browse your files'}
        </p>
      </div>

      {/* File type badges */}
      {!resumeFile && (
        <div className="flex items-center gap-2">
          {['PDF', 'TXT', 'Max 4 MB'].map((t) => (
            <span
              key={t}
              className="rounded-full border border-(--card-border) bg-(--card-bg) px-2.5 py-0.5 text-[11px] font-medium text-(--text-muted)"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Trust note */}
      <div className="flex items-center gap-1.5 rounded-full border border-(--card-border)/60 bg-(--card-bg)/80 px-3 py-1">
        <Lock className="size-3 text-(--text-muted)" aria-hidden />
        <span className="text-[11px] text-(--text-muted)">Private &amp; encrypted</span>
      </div>

      <input
        id="resumeUpload"
        type="file"
        accept=".pdf,.txt"
        multiple={false}
        className="hidden"
        disabled={isDisabled}
        onChange={(e) => {
          const files = e.target.files
          onFileChange(files?.[0] ?? null)
          e.target.value = ''
        }}
      />
    </label>
  )
}

function ProcessingCard({ message }: { message: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-(--accent-primary)/30 bg-(--accent-primary)/8">
      {/* Shimmer bar */}
      <div className="relative h-[3px] overflow-hidden bg-(--accent-primary)/20">
        <motion.div
          className="absolute inset-y-0 w-1/2 rounded-full"
          style={{ background: 'var(--accent-primary)' }}
          animate={{ x: ['−100%', '300%'] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
        />
      </div>
      <div className="flex items-center gap-4 px-5 py-4">
        <div className="relative flex size-9 shrink-0 items-center justify-center">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-(--accent-primary)/30" />
          <span className="relative flex size-5 items-center justify-center">
            <span className="size-4 animate-spin rounded-full border-2 border-(--accent-primary) border-t-transparent" />
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-(--text-primary)">AI is analyzing your resume</p>
          <p className="mt-0.5 text-xs text-(--text-secondary)">{message}</p>
        </div>
      </div>
    </div>
  )
}

function ParsedSuccessCard({
  parsedResume,
  resumeFile,
  resumeFileName,
  parseWarning,
}: {
  parsedResume: ParsedResume | null
  resumeFile: File | null
  resumeFileName: string | null
  parseWarning?: string
}) {
  const displayName = resumeFile?.name ?? resumeFileName
  const profile = parsedResume ? coerceParsedResume(parsedResume) : null
  const topSkills = profile?.skills.slice(0, 5) ?? []

  return (
    <div
      className="overflow-hidden rounded-2xl border border-emerald-500/30"
      style={{ background: 'color-mix(in srgb, var(--accent-success) 7%, var(--card-bg))' }}
    >
      <div
        className="h-[3px] w-full"
        style={{ background: 'var(--accent-success)' }}
      />
      <div className="px-4 py-3 sm:px-4 sm:py-2.5">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-(--accent-success) sm:size-[1.125rem]" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-(--accent-success) sm:text-sm">Resume analyzed</p>
            {displayName && (
              <p className="mt-0.5 truncate text-[10px] text-(--text-muted) sm:text-[11px]">{displayName}</p>
            )}
          </div>
        </div>

        {parseWarning && (
          <p className="mt-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-[10px] leading-snug text-amber-200/90 sm:text-[11px]">
            {parseWarning}
          </p>
        )}

        {profile && (
          <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
            {profile.target_role && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-(--accent-success) sm:px-2.5 sm:py-1 sm:text-[11px]">
                Role: {profile.target_role}
              </span>
            )}
            {topSkills.length > 0 && (
              <span className="max-w-full truncate rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-(--accent-success) sm:px-2.5 sm:py-1 sm:text-[11px]">
                Skills: {topSkills.join(', ')}
                {profile.skills.length > topSkills.length ? '…' : ''}
              </span>
            )}
            {profile.experience_estimate && profile.experience_estimate !== 'Not specified' && (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-(--accent-success) sm:px-2.5 sm:py-1 sm:text-[11px]">
                Exp: {profile.experience_estimate}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function OnboardingStepResume({
  data,
  interviewerName,
  resumeFile,
  resumeFileName,
  resumeState,
  statusMessage,
  parsedResume,
  resumeParseWarning = '',
  error,
  onResumeFileChange,
  onUploadResume,
  onRetry,
  jdText,
  jdFile,
  jdExtractLoading,
  jdExtractError,
  jdParseStatus,
  jdParseError,
  jdShowRawEditor,
  parsedJd,
  onJdTextChange,
  onJdFileChange,
  onJdExtract,
  onJdShowRawEditor,
  onJdBlur,
  onJdClear,
  difficulty,
  difficultyTouched,
  questionCount,
  onDifficultyChange,
  onMatchDifficultySettings,
  canBegin,
  startLoading,
  startError,
  onBack,
  onStartInterview,
  onEditGoalAndVoice,
}: OnboardingStepResumeProps) {
  const [isDragOver,   setIsDragOver]   = useState(false)
  const [fileError,    setFileError]    = useState('')
  const [diffOpen,     setDiffOpen]     = useState(false)

  const isProcessing = resumeState === 'uploading' || resumeState === 'processing'
  const isParsed     = resumeState === 'parsed'
  const isFailed     = resumeState === 'failed'
  const showUpload   = !isProcessing && !isParsed

  // Drag-and-drop
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }
  const handleDragLeave = () => setIsDragOver(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setFileError('')
      onResumeFileChange(file)
    }
  }

  const handleResumeFileInput = (file: File | null) => {
    setFileError('')
    onResumeFileChange(file)
  }

  const modeIcon: LucideIcon = data.mode === 'Technical' ? Brain : data.mode === 'HR' ? Mic2 : Target

  const modeLabel =
    data.mode === 'Technical' ? 'Technical'
    : data.mode === 'HR'      ? 'HR Behavioral'
    :                           'Mixed (70% tech)'

  const durationLabel = `~${questionCount * 1}–${questionCount + 4} min`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="dashboard-premium-card flex flex-col max-lg:overflow-visible lg:min-h-0 lg:flex-1 lg:overflow-hidden"
    >
      {/* ── Card header — compact on desktop to keep CTA above the fold ─────── */}
      <header className="shrink-0 border-b border-(--card-border)/80 px-4 py-2.5 text-center sm:px-5 lg:py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-(--accent-primary)">
          Step 2 · Resume &amp; Start
        </p>
        <h2 className="mt-0.5 text-base font-bold tracking-tight text-(--text-primary) sm:text-lg lg:text-[15px] lg:leading-snug">
          Prepare your session
        </h2>
        <p className="mt-0.5 hidden text-[11px] text-(--text-secondary) sm:block lg:hidden">
          Upload your resume — questions calibrate to your background.
        </p>
      </header>

      {/* ── Two-column body ──────────────────────────────────────────────────── */}
      <div className="max-lg:overflow-visible lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-y-contain lg:overflow-hidden">
        <div className="grid grid-cols-1 gap-0 max-lg:min-h-0 lg:min-h-full lg:h-full lg:grid-cols-[7fr_5fr] lg:divide-x lg:divide-(--card-border)/60">

          {/* ═══ LEFT: Upload + JD ══════════════════════════════════════════ */}
          <div className="flex flex-col gap-3 p-3 sm:gap-4 sm:p-4 max-lg:overflow-visible lg:h-full lg:overflow-y-auto lg:overscroll-y-contain lg:pb-4 lg:pr-4 lg:pl-4">

            {/* Upload section */}
            <section aria-label="Resume upload">
              <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
                Resume
              </p>

              <AnimatePresence mode="wait">
                {/* IDLE / failed — show upload zone */}
                {showUpload && (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <UploadZone
                      resumeFile={resumeFile}
                      isDragOver={isDragOver}
                      isDisabled={isProcessing}
                      onFileChange={handleResumeFileInput}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    />

                    {/* Upload button — appears after file selection */}
                    <AnimatePresence>
                      {resumeFile && (
                        <motion.button
                          key="upload-btn"
                          type="button"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          onClick={onUploadResume}
                          disabled={isProcessing}
                          className="w-full rounded-xl bg-(--accent-primary) py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-(--accent-hover) disabled:opacity-50"
                          style={{ boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}
                        >
                          Analyze with AI →
                        </motion.button>
                      )}
                    </AnimatePresence>

                    {/* Errors */}
                    {(isFailed || fileError) && (
                      <div className="flex items-start gap-2 rounded-xl border border-(--accent-danger)/30 bg-(--accent-danger)/8 px-3 py-2.5">
                        <AlertCircle className="mt-0.5 size-4 shrink-0 text-(--accent-danger)" aria-hidden />
                        <div className="flex-1">
                          <p className="text-[12px] text-(--accent-danger)">{fileError || error}</p>
                          {isFailed && (
                            <button type="button" onClick={onRetry} className="mt-1 text-[11px] font-semibold text-(--accent-primary)">
                              Try again →
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* PROCESSING */}
                {isProcessing && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    <ProcessingCard message={statusMessage} />
                    {resumeParseWarning && (
                      <p className="mt-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200/90">
                        {resumeParseWarning}
                      </p>
                    )}
                  </motion.div>
                )}

                {/* PARSED SUCCESS */}
                {isParsed && (
                  <motion.div
                    key="parsed"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <ParsedSuccessCard
                      parsedResume={parsedResume}
                      resumeFile={resumeFile}
                      resumeFileName={resumeFileName}
                      parseWarning={resumeParseWarning || parsedResume?.parse_warning}
                    />

                    {/* Change resume */}
                    <label
                      htmlFor="resumeReplace"
                      className="mt-2.5 inline-flex cursor-pointer items-center gap-1.5 text-[11px] font-medium text-(--text-muted) hover:text-(--text-primary) transition-colors"
                    >
                      <RotateCcw className="size-3" aria-hidden />
                      Replace resume
                      <input
                        id="resumeReplace"
                        type="file"
                        accept=".pdf,.txt"
                        multiple={false}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) { onRetry(); onResumeFileChange(f) }
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* JD section */}
            <section aria-label="Job description" className="space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
                  Job description
                  <span className="ml-1.5 normal-case font-normal text-(--text-muted)/70">(optional)</span>
                </p>
                {jdText.trim().length > 0 && (
                  <span className="text-[10px] font-semibold text-(--accent-success)">✓ Added</span>
                )}
              </div>

              <AnimatePresence mode="wait">
                {/* Textarea / raw editor */}
                {(jdText.trim().length === 0 || jdShowRawEditor) && (
                  <motion.div
                    key="jd-editor"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    <textarea
                      value={jdText}
                      maxLength={12000}
                      rows={3}
                      onChange={(e) => { onJdTextChange(e.target.value) }}
                      onBlur={onJdBlur}
                      placeholder="Paste the employer's job posting here for tailored questions…"
                      className="min-h-[4.5rem] w-full resize-y rounded-xl border border-(--card-border) bg-(--bg-secondary) px-3 py-2 text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--accent-primary) focus:outline-none focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] transition-all duration-200 sm:min-h-[5rem] sm:px-3.5 sm:py-2.5"
                    />
                    {jdShowRawEditor && (
                      <button
                        type="button"
                        onClick={() => { const r = refineJobDescriptionForUi(jdText); onJdTextChange(r); onJdShowRawEditor(false); onJdBlur() }}
                        className="text-[11px] font-semibold text-(--accent-primary)"
                      >
                        Done editing
                      </button>
                    )}
                  </motion.div>
                )}

                {/* Parsed JD view */}
                {jdText.trim().length > 0 && !jdShowRawEditor && (
                  <motion.div
                    key="jd-parsed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-2"
                  >
                    {jdParseStatus === 'parsing' ? (
                      <div className="flex items-center gap-3 rounded-xl border border-(--accent-primary)/30 bg-(--accent-primary)/8 px-4 py-3">
                        <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-(--accent-primary) border-t-transparent" />
                        <div>
                          <p className="text-xs font-medium text-(--text-primary)">Structuring the posting…</p>
                          <p className="text-[11px] text-(--text-muted)">Usually 10–20 seconds.</p>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          'rounded-xl border p-3.5',
                          jdParseStatus === 'failed'
                            ? 'border-amber-500/30'
                            : 'border-emerald-500/25',
                        )}
                        style={{
                          background: jdParseStatus === 'failed'
                            ? 'color-mix(in srgb, var(--accent-warning) 7%, var(--card-bg))'
                            : 'color-mix(in srgb, var(--accent-success) 7%, var(--card-bg))',
                        }}
                      >
                        <p className={cn(
                          'text-[13px] font-semibold',
                          jdParseStatus === 'failed' ? 'text-amber-700 dark:text-amber-300' : 'text-(--accent-success)',
                        )}>
                          {jdParseStatus === 'failed' ? 'Posting saved (structure unavailable)' : 'Job description ready'}
                        </p>
                        <p className="mt-1 text-[11px] text-(--text-muted)">
                          {parsedJd
                            ? jobDescriptionSummaryLine(parsedJd)
                            : jdParseStatus === 'failed'
                              ? (jdParseError || 'You can edit the text or continue with the posting as-is.')
                              : 'Structured preview preparing…'}
                        </p>

                        {/* Dialog: view parsed JD */}
                        {parsedJd && (
                          <Dialog>
                            <DialogTrigger className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-(--card-border) bg-(--card-bg) px-3 py-1.5 text-[11px] font-semibold text-(--text-primary) shadow-sm transition-colors hover:bg-(--bg-secondary)">
                              <Eye className="size-3" aria-hidden />
                              Preview posting
                            </DialogTrigger>
                            <DialogContent
                              className="flex h-[min(92dvh,44rem)] max-h-[min(92dvh,44rem)] w-[min(calc(100vw-1.25rem),42rem)] max-w-[calc(100%-1.25rem)] flex-col gap-0 overflow-hidden rounded-xl border border-(--card-border) bg-(--card-bg) p-0 text-(--text-primary) shadow-xl sm:max-w-3xl"
                            >
                              <DialogHeader className="shrink-0 border-b border-(--card-border) p-4 sm:p-5">
                                <DialogTitle>Job posting</DialogTitle>
                                <DialogDescription className="sr-only">Structured summary of the employer posting.</DialogDescription>
                              </DialogHeader>
                              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-5">
                                <ParsedJobDescriptionSections parsed={parsedJd} />
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}

                        {/* Edit / remove */}
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onJdShowRawEditor(true)}
                            className="inline-flex items-center gap-1 rounded-lg border border-(--card-border) bg-(--card-bg) px-2.5 py-1.5 text-[11px] font-semibold text-(--text-primary) hover:bg-(--bg-secondary)"
                          >
                            <Pencil className="size-3" aria-hidden />
                            Edit text
                          </button>
                          <button
                            type="button"
                            onClick={onJdClear}
                            className="inline-flex items-center gap-1 rounded-lg border border-(--card-border) px-2.5 py-1.5 text-[11px] font-semibold text-(--text-secondary) hover:text-(--text-primary)"
                          >
                            <X className="size-3" aria-hidden />
                            Remove JD
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* JD file upload */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-(--card-border) px-2.5 py-1.5 text-[11px] font-semibold text-(--text-primary) hover:bg-(--bg-secondary) transition-colors">
                  <FileText className="size-3" aria-hidden />
                  Upload JD file
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    multiple={false}
                    className="sr-only"
                    onChange={(e) => {
                      const files = e.target.files
                      if (files && files.length > 1) { onJdFileChange(null); return }
                      onJdFileChange(files?.[0] ?? null)
                      e.target.value = ''
                    }}
                  />
                </label>
                {jdFile && (
                  <button
                    type="button"
                    disabled={jdExtractLoading}
                    onClick={onJdExtract}
                    className="rounded-lg border border-(--accent-primary)/30 bg-(--accent-primary)/10 px-2.5 py-1.5 text-[11px] font-semibold text-(--accent-primary) hover:bg-(--accent-primary)/20 disabled:opacity-50 transition-colors"
                  >
                    {jdExtractLoading ? 'Reading…' : `Extract "${jdFile.name.length > 20 ? `${jdFile.name.slice(0, 17)}…` : jdFile.name}"`}
                  </button>
                )}
              </div>
              {jdExtractError && (
                <p className="text-[11px] text-(--accent-danger)" role="alert">{jdExtractError}</p>
              )}
            </section>
          </div>

          {/* ═══ RIGHT: Session summary + CTA (sticky CTA on desktop split) ═══ */}
          <div className="flex flex-col gap-2 p-3 sm:gap-2.5 sm:p-4 max-lg:overflow-visible lg:min-h-0 lg:flex-1 lg:overflow-hidden lg:pb-4 lg:pl-4">

            {/* Session preview card — denser grid on sm+ */}
            <section aria-label="Session preview" className="shrink-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted) sm:text-[11px]">
                  Your session
                </p>
                <div className="flex items-center gap-2">
                  <Link
                    href="/settings"
                    className="inline-flex items-center gap-0.5 text-[10px] font-medium text-(--text-muted) hover:text-(--text-primary) transition-colors sm:text-[11px]"
                  >
                    <Settings className="size-2.5 sm:size-3" aria-hidden />
                    <span className="hidden sm:inline">Prefs</span>
                  </Link>
                  <button
                    type="button"
                    onClick={onEditGoalAndVoice}
                    className="text-[10px] font-medium text-(--accent-primary) hover:underline sm:text-[11px]"
                  >
                    Edit →
                  </button>
                </div>
              </div>

              <div
                className="mt-1.5 overflow-hidden rounded-xl border border-(--card-border) sm:mt-2 sm:rounded-2xl"
                style={{ background: 'color-mix(in srgb, var(--bg-secondary) 40%, var(--card-bg))' }}
              >
                <div className="h-[2px] w-full sm:h-[3px]" style={{ background: 'var(--accent-primary)' }} />

                <div className="grid grid-cols-1 px-3 py-1 sm:grid-cols-2 sm:gap-x-2 sm:px-3 sm:py-1.5 lg:grid-cols-1 lg:gap-x-0">
                  <SessionRow compact icon={User}           label="Role"       value={data.role || '—'} />
                  <SessionRow compact icon={modeIcon}        label="Mode"       value={modeLabel} />
                  <SessionRow compact icon={MessageSquare}   label="Questions"  value={`${questionCount} questions`} />
                  <SessionRow compact icon={Clock}           label="Duration"   value={durationLabel} />
                  <SessionRow compact icon={Mic}             label="Voice"      value={interviewerName} />
                  <SessionRow compact icon={Sparkles}        label="Follow-ups" value="Enabled" accent />

                  {/* Difficulty — full width */}
                  <div className="col-span-1 flex items-center gap-2 border-b border-(--card-border)/50 py-1.5 last:border-0 sm:col-span-2 lg:col-span-1">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-(--accent-primary)/10">
                      <Gauge className="size-3 text-(--accent-primary)" aria-hidden />
                    </div>
                    <p className="w-14 shrink-0 text-[10px] text-(--text-muted) sm:text-[11px]">Difficulty</p>
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      <span className="truncate text-[12px] font-semibold capitalize text-(--text-primary)">{difficulty}</span>
                      {difficultyTouched && (
                        <span className="shrink-0 rounded-full border border-(--card-border) px-1 py-px text-[8px] font-medium text-(--text-muted) sm:text-[9px]">
                          custom
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDiffOpen((v) => !v)}
                      className="shrink-0 rounded-md border border-(--card-border) bg-(--card-bg) px-1.5 py-0.5 text-[9px] font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-colors sm:rounded-lg sm:px-2 sm:py-1 sm:text-[10px]"
                    >
                      {diffOpen ? 'Done' : 'Change'}
                    </button>
                  </div>

                  {/* Difficulty selector — inline toggle */}
                  <AnimatePresence>
                    {diffOpen && (
                      <motion.div
                        key="diff-picker"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        className="col-span-1 overflow-hidden sm:col-span-2 lg:col-span-1"
                      >
                        <div className="flex flex-wrap items-center gap-1.5 pb-2 pt-0.5 sm:gap-2 sm:pb-2.5">
                          {(['easy', 'medium', 'hard'] as const).map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => { onDifficultyChange(level); setDiffOpen(false) }}
                              className={cn(
                                'min-h-[36px] rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors sm:min-h-0 sm:px-3',
                                difficulty === level
                                  ? 'border-(--accent-primary) bg-(--accent-primary) text-white'
                                  : 'border-(--card-border) bg-(--bg-secondary) text-(--text-secondary) hover:border-(--accent-primary)/40',
                              )}
                            >
                              {level}
                            </button>
                          ))}
                          {difficultyTouched && (
                            <button
                              type="button"
                              onClick={() => { onMatchDifficultySettings(); setDiffOpen(false) }}
                              className="min-h-[36px] text-[10px] font-medium text-(--text-muted) underline hover:text-(--text-primary) sm:min-h-0"
                            >
                              Match Settings
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            {/* Error + CTA — sticky on desktop split so Start stays visible */}
            <div
              className={cn(
                'shrink-0 space-y-2',
                'lg:sticky lg:bottom-0 lg:z-10 lg:mt-auto',
                'lg:border-t lg:border-(--card-border)/40 lg:bg-(--card-bg)/95 lg:pt-2 lg:backdrop-blur-[2px]',
                'pb-[max(0.25rem,env(safe-area-inset-bottom,0px))]',
              )}
            >
            {startError && (
              <p className="rounded-xl border border-(--accent-danger)/30 bg-(--accent-danger)/8 px-3 py-2 text-[12px] text-(--accent-danger)" role="alert">
                {startError}
              </p>
            )}

              <motion.button
                type="button"
                onClick={onStartInterview}
                disabled={!canBegin || startLoading}
                whileHover={canBegin && !startLoading ? { scale: 1.01 } : undefined}
                whileTap={canBegin && !startLoading ? { scale: 0.98 } : undefined}
                className={cn(
                  'relative flex min-h-[48px] w-full items-center justify-center overflow-hidden rounded-xl px-5 py-3 text-sm font-bold transition-all duration-300 sm:rounded-2xl',
                  canBegin && !startLoading
                    ? 'text-white cursor-pointer'
                    : 'cursor-not-allowed text-(--text-muted)',
                )}
                style={
                  canBegin && !startLoading
                    ? {
                        background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
                        boxShadow: '0 6px 28px rgba(99,102,241,0.45), 0 2px 8px rgba(99,102,241,0.25)',
                      }
                    : {
                        background: 'color-mix(in srgb, var(--bg-secondary) 80%, var(--card-bg))',
                      }
                }
              >
                {/* Ambient glow sweep — only when ready */}
                {canBegin && !startLoading && (
                  <motion.div
                    className="pointer-events-none absolute inset-0 rounded-2xl"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
                    }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut', repeatDelay: 1.5 }}
                  />
                )}

                <span className="relative flex items-center justify-center gap-2.5">
                  {startLoading ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Preparing session…
                    </>
                  ) : (
                    <>
                      <Rocket className="size-4" aria-hidden />
                      Start AI Interview
                    </>
                  )}
                </span>
              </motion.button>

              {/* Status hint below CTA */}
              <p className="text-center text-[10px] text-(--text-muted) sm:text-[11px]">
                {!isParsed
                  ? 'Upload your resume above to enable'
                  : canBegin
                    ? 'Your AI interviewer is standing by'
                    : 'Complete goal, voice, and resume to begin'}
              </p>

              {/* Back — compact row */}
              <div className="flex justify-center pt-0.5">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex min-h-[44px] items-center gap-1 px-2 text-sm font-medium text-(--text-secondary) transition-colors hover:text-(--text-primary)"
                >
                  <ChevronLeft className="size-4" aria-hidden />
                  Back
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  )
}
