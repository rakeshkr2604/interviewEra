'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Star, Loader2 } from 'lucide-react'
import { collectFeedbackContext, type FeedbackSessionContext } from '@/lib/feedback/collect-context'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScreenshotUploader } from '@/components/feedback/ScreenshotUploader'
import {
  TECHNICAL_FAILURE_CATEGORIES,
  TECHNICAL_FAILURE_CATEGORY_LABELS,
  type FeedbackInterviewOption,
  type TechnicalFailureCategory,
} from '@/lib/technical-failures/types'
import { TECHNICAL_FAILURE_STATUS_LABELS } from '@/lib/technical-failures/status'
import {
  INTERVIEW_TECHNICAL_BUG_OPTION_ID,
  INTERVIEW_TECHNICAL_BUG_OPTION_LABEL,
} from '@/lib/technical-failures/ux'
import { cn } from '@/lib/utils'
import {
  IE_FIELD_GROUP_CLASS,
  IE_FIELD_SURFACE_STYLE,
  IE_INPUT_TOOL_CLASS,
  IE_LABEL_CLASS,
  IE_SUBMIT_BUTTON_CLASS,
  IE_SUBMIT_BUTTON_STYLE,
  IE_TEXTAREA_TOOL_CLASS,
  IE_SPINNER_CLASS,
} from '@/lib/theme/component-classes'

const MAX_TEXT = 2000
const OTHER_OPTION_ID = 'other' as const

type FeedbackOption = { id: string; label: string }

const LIKED_OPTIONS: readonly FeedbackOption[] = [
  { id: 'resume_aware', label: 'Questions matched my resume and experience' },
  { id: 'voice_practice', label: 'Voice interview felt realistic' },
  { id: 'follow_ups', label: 'Smart follow-up questions' },
  { id: 'scoring', label: 'Clear scores and actionable feedback' },
  { id: 'report', label: 'Interview report helped me improve' },
  { id: 'ui', label: 'Simple, clean, and easy to use' },
  { id: 'speed', label: 'Fast setup — started practicing quickly' },
  { id: OTHER_OPTION_ID, label: 'Other (tell us yourself)' },
]

const CONFUSION_OPTIONS: readonly FeedbackOption[] = [
  { id: 'nothing', label: 'Nothing — everything was clear' },
  { id: 'how_to_start', label: 'Unclear how to start an interview' },
  { id: 'mic_setup', label: 'Mic or voice setup was confusing' },
  { id: 'credits', label: 'Credits, plans, or pricing were unclear' },
  { id: 'report_meaning', label: 'Hard to understand what the scores mean' },
  { id: 'next_steps', label: 'Unsure what to practice next' },
  { id: 'too_many_steps', label: 'Too many steps before I could practice' },
  { id: OTHER_OPTION_ID, label: 'Other (tell us yourself)' },
]

/** General product bugs only. Interview incidents converge on technical_issue. */
const BUGS_OPTIONS: readonly FeedbackOption[] = [
  { id: 'none', label: 'No issues — everything worked smoothly' },
  {
    id: INTERVIEW_TECHNICAL_BUG_OPTION_ID,
    label: INTERVIEW_TECHNICAL_BUG_OPTION_LABEL,
  },
  { id: 'upload_fail', label: 'Resume upload failed' },
  { id: 'wrong_score', label: 'Score was missing or looked wrong' },
  { id: 'login_issue', label: 'Login or account issue' },
  { id: OTHER_OPTION_ID, label: 'Other (tell us yourself)' },
]

type FeedbackCategory =
  | 'general'
  | 'bug'
  | 'feature'
  | 'interview'
  | 'report'
  | 'ai_quality'
  | 'technical_issue'

type WouldUse = boolean | null

function composeFeedbackField(
  selectedId: string,
  options: readonly FeedbackOption[],
  otherText: string,
): string {
  if (!selectedId) return ''
  if (selectedId === OTHER_OPTION_ID) return otherText.trim().slice(0, MAX_TEXT)
  const label = options.find((o) => o.id === selectedId)?.label ?? ''
  return label.slice(0, MAX_TEXT)
}

function FeedbackOptionField({
  id,
  label,
  options,
  selectedId,
  onSelectedIdChange,
  otherText,
  onOtherTextChange,
  disabled,
  placeholder,
  otherPlaceholder,
}: {
  id: string
  label: string
  options: readonly FeedbackOption[]
  selectedId: string
  onSelectedIdChange: (id: string) => void
  otherText: string
  onOtherTextChange: (v: string) => void
  disabled?: boolean
  placeholder?: string
  otherPlaceholder?: string
}) {
  const otherSelected = selectedId === OTHER_OPTION_ID

  function handleSelect(nextId: string) {
    onSelectedIdChange(nextId)
    if (nextId !== OTHER_OPTION_ID) onOtherTextChange('')
  }

  return (
    <div className={IE_FIELD_GROUP_CLASS}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        id={id}
        value={selectedId}
        disabled={disabled}
        onChange={(e) => handleSelect(e.target.value)}
        className={IE_INPUT_TOOL_CLASS}
        style={IE_FIELD_SURFACE_STYLE}
      >
        <option value="">{placeholder ?? 'Select an option…'}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {otherSelected ? (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Tell us more
            </span>
            <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {otherText.length}/{MAX_TEXT}
            </span>
          </div>
          <Textarea
            id={`${id}-other`}
            value={otherText}
            maxLength={MAX_TEXT}
            disabled={disabled}
            placeholder={otherPlaceholder ?? 'Add your own note…'}
            onChange={(e) => onOtherTextChange(e.target.value)}
            className={IE_TEXTAREA_TOOL_CLASS}
            style={IE_FIELD_SURFACE_STYLE}
          />
        </div>
      ) : null}
    </div>
  )
}

function starFillWidth(starIndex: number, rating: number): string {
  if (rating >= starIndex) return '100%'
  if (rating >= starIndex - 0.5) return '50%'
  return '0%'
}

function RatingPicker({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  const [hover, setHover] = useState(0)
  const active = hover || value

  function pick(starIndex: number, half: boolean) {
    const next = half ? Math.max(1, starIndex - 0.5) : starIndex
    onChange(next)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="flex items-center gap-0.5"
        role="radiogroup"
        aria-label="Overall rating, 1 to 5 in half-star steps"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => {
          const fill = starFillWidth(n, active)
          const halfValue = Math.max(1, n - 0.5)
          return (
            <div
              key={n}
              className="relative size-8 shrink-0 rounded-md transition-transform hover:scale-110 focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--accent-primary)]/40"
            >
              <Star
                className="pointer-events-none absolute inset-0.5 size-7 fill-transparent"
                style={{ color: 'var(--text-muted)' }}
                strokeWidth={1.75}
                aria-hidden
              />
              <span
                className="pointer-events-none absolute inset-0.5 overflow-hidden"
                style={{ width: fill }}
              >
                <Star
                  className="size-7 fill-amber-400"
                  style={{ color: '#f59e0b' }}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </span>
              <button
                type="button"
                role="radio"
                aria-checked={value === halfValue}
                aria-label={`${halfValue} stars`}
                disabled={disabled}
                className="absolute inset-y-0 left-0 w-1/2 disabled:cursor-not-allowed disabled:opacity-60"
                onMouseEnter={() => setHover(halfValue)}
                onFocus={() => setHover(halfValue)}
                onClick={() => pick(n, true)}
              />
              <button
                type="button"
                role="radio"
                aria-checked={value === n}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                disabled={disabled}
                className="absolute inset-y-0 right-0 w-1/2 disabled:cursor-not-allowed disabled:opacity-60"
                onMouseEnter={() => setHover(n)}
                onFocus={() => setHover(n)}
                onClick={() => pick(n, false)}
              />
            </div>
          )
        })}
      </div>
      {value > 0 ? (
        <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
          {Number.isInteger(value) ? value : value.toFixed(1)} / 5
        </span>
      ) : null}
    </div>
  )
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor} className={IE_LABEL_CLASS}>
      {children}
    </Label>
  )
}

export function FeedbackForm({
  defaultName = '',
  interviews = [],
  initialCategory = 'interview',
  onTechnicalCaseReported,
}: {
  defaultName?: string
  interviews?: FeedbackInterviewOption[]
  initialCategory?: FeedbackCategory
  onTechnicalCaseReported?: (caseId: string | null) => void
}) {
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState(defaultName)
  const [rating, setRating] = useState(0)
  const [likedId, setLikedId] = useState('')
  const [likedOther, setLikedOther] = useState('')
  const [confusionId, setConfusionId] = useState('')
  const [confusionOther, setConfusionOther] = useState('')
  const [bugsId, setBugsId] = useState('')
  const [bugsOther, setBugsOther] = useState('')
  const [wouldUse, setWouldUse] = useState<WouldUse>(null)
  const [consentPublicDisplay, setConsentPublicDisplay] = useState(false)
  const [npsScore, setNpsScore] = useState<number | null>(null)
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>(initialCategory)
  const [technicalInterviewId, setTechnicalInterviewId] = useState('')
  const [technicalFailureCategory, setTechnicalFailureCategory] = useState<
    TechnicalFailureCategory | ''
  >('')
  const [technicalIssueDescription, setTechnicalIssueDescription] = useState('')
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null)
  const [screenshotUploading, setScreenshotUploading] = useState(false)
  const [uploaderKey, setUploaderKey] = useState(0)
  const [sessionCtx, setSessionCtx] = useState<FeedbackSessionContext | null>(null)
  const [existingCaseNotice, setExistingCaseNotice] = useState<{
    status: string
    caseId?: string
  } | null>(null)

  useEffect(() => {
    setFeedbackCategory(initialCategory)
  }, [initialCategory])

  useEffect(() => {
    collectFeedbackContext()
      .then((context) => {
        setSessionCtx(context)
        if (context.session_id && interviews.some((interview) => interview.id === context.session_id)) {
          setTechnicalInterviewId(context.session_id)
        }
      })
      .catch(() => {
        /* non-fatal */
      })
  }, [interviews])

  function reset(keepCategory: FeedbackCategory = 'interview') {
    setName(defaultName)
    setRating(0)
    setLikedId('')
    setLikedOther('')
    setConfusionId('')
    setConfusionOther('')
    setBugsId('')
    setBugsOther('')
    setWouldUse(null)
    setConsentPublicDisplay(false)
    setNpsScore(null)
    setFeedbackCategory(keepCategory)
    setTechnicalInterviewId('')
    setTechnicalFailureCategory('')
    setTechnicalIssueDescription('')
    setScreenshotPath(null)
    setScreenshotUploading(false)
    setUploaderKey((k) => k + 1)
  }

  function switchToTechnicalIssue(prefillDescription = '') {
    setFeedbackCategory('technical_issue')
    setBugsId('')
    setBugsOther('')
    if (prefillDescription) setTechnicalIssueDescription(prefillDescription.slice(0, MAX_TEXT))
    toast.message('Switched to Interview technical issue so the team can investigate; credit restoration is review-based.')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    if (screenshotUploading) {
      toast.error('Hang on — your screenshot is still uploading.')
      return
    }

    const isTechnicalIssue = feedbackCategory === 'technical_issue'
    if (!isTechnicalIssue && rating < 1) {
      toast.error('Please pick a star rating first.')
      return
    }

    if (bugsId === INTERVIEW_TECHNICAL_BUG_OPTION_ID) {
      switchToTechnicalIssue()
      return
    }

    const likedText = isTechnicalIssue ? '' : composeFeedbackField(likedId, LIKED_OPTIONS, likedOther)
    const confusionText = isTechnicalIssue
      ? ''
      : composeFeedbackField(confusionId, CONFUSION_OPTIONS, confusionOther)
    const bugsText = isTechnicalIssue
      ? technicalIssueDescription.trim()
      : composeFeedbackField(bugsId, BUGS_OPTIONS, bugsOther)

    if (!isTechnicalIssue && likedId === OTHER_OPTION_ID && !likedOther.trim()) {
      toast.error('Add a short note for “Other” under what you liked.')
      return
    }
    if (!isTechnicalIssue && confusionId === OTHER_OPTION_ID && !confusionOther.trim()) {
      toast.error('Add a short note for “Other” under what confused you.')
      return
    }
    if (!isTechnicalIssue && bugsId === OTHER_OPTION_ID && !bugsOther.trim()) {
      toast.error('Add a short note for “Other” under bugs or issues.')
      return
    }

    if (isTechnicalIssue && interviews.length === 0) {
      toast.error('No interviews found to report. Email support@interviewera.com if you need help.')
      return
    }
    if (isTechnicalIssue && !technicalInterviewId) {
      toast.error('Select the interview affected by the technical issue.')
      return
    }
    if (isTechnicalIssue && !technicalFailureCategory) {
      toast.error('Select the technical issue type.')
      return
    }
    if (isTechnicalIssue && !technicalIssueDescription.trim()) {
      toast.error('Describe what happened during the interview.')
      return
    }

    if (!likedText && !confusionText && !bugsText && !screenshotPath) {
      toast.error('Choose at least one dropdown option, or attach a screenshot.')
      return
    }

    setSubmitting(true)
    setExistingCaseNotice(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || defaultName,
          rating: isTechnicalIssue ? null : rating,
          likedText,
          confusionText,
          bugsText,
          wouldUseAgain: isTechnicalIssue ? null : wouldUse,
          consentPublicDisplay: isTechnicalIssue ? false : consentPublicDisplay,
          npsScore: isTechnicalIssue ? null : npsScore,
          feedbackCategory,
          ...(isTechnicalIssue
            ? {
                interviewId: technicalInterviewId,
                technicalFailureCategory,
                technicalIssueDescription: technicalIssueDescription.trim(),
              }
            : {}),
          pageUrl: typeof window !== 'undefined' ? window.location.href : '',
          browserInfo: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          ...(screenshotPath ? { screenshotPath } : {}),
          ...(sessionCtx ? { sessionContext: sessionCtx } : {}),
        }),
      })

      const data = (await res.json().catch(() => null)) as {
        error?: string
        deduped?: boolean
        technicalFailureCase?: { status?: string; created?: boolean }
      } | null

      if (!res.ok) {
        toast.error(data?.error || 'Something went wrong. Please try again.')
        return
      }

      if (isTechnicalIssue && data?.deduped) {
        const status = data.technicalFailureCase?.status ?? 'submitted'
        setExistingCaseNotice({ status })
        onTechnicalCaseReported?.(null)
        toast.message('This technical issue has already been reported.', {
          description: `Current status: ${TECHNICAL_FAILURE_STATUS_LABELS[status as keyof typeof TECHNICAL_FAILURE_STATUS_LABELS] ?? status}.`,
        })
        document.getElementById('technical-issue-status')?.scrollIntoView({ behavior: 'smooth' })
        return
      }

      toast.success(
        isTechnicalIssue
          ? 'Interview technical issue submitted for investigation. Target resolution: 48–72 hours.'
          : 'Thanks for your feedback. We review every submission.',
      )
      if (isTechnicalIssue) onTechnicalCaseReported?.(null)
      reset(isTechnicalIssue ? 'technical_issue' : 'interview')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const isTechnicalIssue = feedbackCategory === 'technical_issue'

  return (
    <form
      onSubmit={handleSubmit}
      className="dashboard-premium-card overflow-hidden"
      style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
    >
      <div className="space-y-5 p-5 sm:p-6">
        <div className={IE_FIELD_GROUP_CLASS}>
          <FieldLabel htmlFor="fb-name">Your name</FieldLabel>
          <input
            id="fb-name"
            type="text"
            value={name}
            maxLength={80}
            disabled={submitting}
            onChange={(e) => setName(e.target.value)}
            placeholder="How should we address you?"
            className={IE_INPUT_TOOL_CLASS}
            style={IE_FIELD_SURFACE_STYLE}
          />
        </div>

        <div className={IE_FIELD_GROUP_CLASS}>
          <FieldLabel htmlFor="fb-category">Feedback type</FieldLabel>
          <select
            id="fb-category"
            value={feedbackCategory}
            disabled={submitting}
            onChange={(e) => {
              const next = e.target.value as FeedbackCategory
              setFeedbackCategory(next)
              setExistingCaseNotice(null)
              if (next === 'technical_issue') setBugsId('')
            }}
            className={IE_INPUT_TOOL_CLASS}
            style={IE_FIELD_SURFACE_STYLE}
          >
            <option value="general">General</option>
            <option value="feature">Feature request</option>
            <option value="bug">Bug report</option>
            <option value="interview">Interview experience</option>
            <option value="technical_issue">Interview technical issue</option>
            <option value="report">Report usefulness</option>
            <option value="ai_quality">AI answer quality</option>
          </select>
        </div>

        {!isTechnicalIssue ? (
          <div className={IE_FIELD_GROUP_CLASS}>
            <FieldLabel htmlFor="fb-rating">Overall rating</FieldLabel>
            <RatingPicker value={rating} onChange={setRating} disabled={submitting} />
          </div>
        ) : null}

        {!isTechnicalIssue ? (
          <>
            <FeedbackOptionField
              id="fb-liked"
              label="What did you like?"
              options={LIKED_OPTIONS}
              selectedId={likedId}
              onSelectedIdChange={setLikedId}
              otherText={likedOther}
              onOtherTextChange={setLikedOther}
              disabled={submitting}
              placeholder="Select what worked well…"
              otherPlaceholder="What else worked well for you…"
            />
            <FeedbackOptionField
              id="fb-confusion"
              label="What confused you?"
              options={CONFUSION_OPTIONS}
              selectedId={confusionId}
              onSelectedIdChange={setConfusionId}
              otherText={confusionOther}
              onOtherTextChange={setConfusionOther}
              disabled={submitting}
              placeholder="Select what felt unclear…"
              otherPlaceholder="What felt unclear or harder than it should be…"
            />
            <FeedbackOptionField
              id="fb-bugs"
              label="Bugs or issues?"
              options={BUGS_OPTIONS}
              selectedId={bugsId}
              onSelectedIdChange={(id) => {
                if (id === INTERVIEW_TECHNICAL_BUG_OPTION_ID) {
                  switchToTechnicalIssue()
                  return
                }
                setBugsId(id)
              }}
              otherText={bugsOther}
              onOtherTextChange={setBugsOther}
              disabled={submitting}
              placeholder="Select an issue, or none…"
              otherPlaceholder="What broke, and what were you doing…"
            />

            <div className="space-y-2">
              <FieldLabel htmlFor="fb-woulduse">Would you use InterviewEra again?</FieldLabel>
              <div className="flex gap-2" role="radiogroup" aria-label="Would you use it again">
                {(
                  [
                    { v: true, label: 'Yes' },
                    { v: false, label: 'No' },
                  ] as const
                ).map(({ v, label }) => {
                  const selected = wouldUse === v
                  return (
                    <button
                      key={label}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={submitting}
                      onClick={() => setWouldUse(selected ? null : v)}
                      className="rounded-full border-2 px-5 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60"
                      style={{
                        borderColor: selected ? 'var(--accent-primary)' : 'var(--card-border)',
                        background: selected
                          ? 'color-mix(in srgb, var(--accent-primary) 14%, transparent)'
                          : 'transparent',
                        color: selected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        ) : null}

        {isTechnicalIssue ? (
          <div
            className="space-y-4 rounded-2xl border p-4"
            style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Interview technical issue
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Submitting a report does not automatically restore an interview credit. If a technical issue prevented your interview from being completed, the team will investigate; if the issue is confirmed after review, the interview credit may be restored. Target
                resolution: 48–72 hours.
              </p>
            </div>

            {existingCaseNotice ? (
              <div
                className="rounded-xl border p-3 text-sm"
                style={{
                  borderColor: 'var(--accent-primary)',
                  background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
                  color: 'var(--text-primary)',
                }}
                role="status"
              >
                This technical issue has already been reported. Current status:{' '}
                <strong>
                  {TECHNICAL_FAILURE_STATUS_LABELS[
                    existingCaseNotice.status as keyof typeof TECHNICAL_FAILURE_STATUS_LABELS
                  ] ?? existingCaseNotice.status}
                </strong>
                .{' '}
                <a href="#technical-issue-status" className="font-semibold underline underline-offset-2">
                  View status
                </a>
              </div>
            ) : null}

            <div className={IE_FIELD_GROUP_CLASS}>
              <FieldLabel htmlFor="fb-technical-interview">Affected interview</FieldLabel>
              <select
                id="fb-technical-interview"
                value={technicalInterviewId}
                disabled={submitting || interviews.length === 0}
                onChange={(e) => setTechnicalInterviewId(e.target.value)}
                className={IE_INPUT_TOOL_CLASS}
                style={IE_FIELD_SURFACE_STYLE}
                required
              >
                <option value="">
                  {interviews.length === 0 ? 'No interviews available' : 'Select an interview…'}
                </option>
                {interviews.map((interview) => (
                  <option key={interview.id} value={interview.id}>
                    {interview.role} · {interview.difficulty} · {interview.status}
                    {interview.started_at
                      ? ` · ${new Date(interview.started_at).toLocaleDateString('en-IN')}`
                      : ''}
                  </option>
                ))}
              </select>
              {interviews.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Email{' '}
                  <a
                    href="mailto:support@interviewera.com?subject=Interview%20technical%20issue"
                    className="underline underline-offset-2"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    support@interviewera.com
                  </a>{' '}
                  if you need help without an interview on file.
                </p>
              ) : null}
            </div>

            <div className={IE_FIELD_GROUP_CLASS}>
              <FieldLabel htmlFor="fb-technical-category">Issue type</FieldLabel>
              <select
                id="fb-technical-category"
                value={technicalFailureCategory}
                disabled={submitting}
                onChange={(e) =>
                  setTechnicalFailureCategory(e.target.value as TechnicalFailureCategory | '')
                }
                className={IE_INPUT_TOOL_CLASS}
                style={IE_FIELD_SURFACE_STYLE}
                required
              >
                <option value="">Select the closest issue…</option>
                {TECHNICAL_FAILURE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {TECHNICAL_FAILURE_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>

            <div className={IE_FIELD_GROUP_CLASS}>
              <div className="flex items-center justify-between">
                <FieldLabel htmlFor="fb-technical-description">What happened?</FieldLabel>
                <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {technicalIssueDescription.length}/{MAX_TEXT}
                </span>
              </div>
              <Textarea
                id="fb-technical-description"
                value={technicalIssueDescription}
                maxLength={MAX_TEXT}
                disabled={submitting}
                placeholder="Describe where the interview stopped, any error shown, and what you tried."
                onChange={(e) => setTechnicalIssueDescription(e.target.value)}
                className={IE_TEXTAREA_TOOL_CLASS}
                style={IE_FIELD_SURFACE_STYLE}
                required
              />
            </div>
          </div>
        ) : (
          <div className={IE_FIELD_GROUP_CLASS}>
            <FieldLabel htmlFor="fb-nps">Overall Score (0–10, optional)</FieldLabel>
            <input
              id="fb-nps"
              type="range"
              min={0}
              max={10}
              value={npsScore ?? 5}
              disabled={submitting}
              onChange={(e) => setNpsScore(parseInt(e.target.value, 10))}
              className="w-full"
            />
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {npsScore === null ? 'Slide to set a score' : `Score: ${npsScore}`}
            </p>
          </div>
        )}

        <ScreenshotUploader
          key={uploaderKey}
          disabled={submitting}
          recommended={isTechnicalIssue}
          onUploadingChange={setScreenshotUploading}
          onUploaded={setScreenshotPath}
          onCleared={() => setScreenshotPath(null)}
        />

        {!isTechnicalIssue ? (
          <label
            htmlFor="fb-consent-public"
            className="flex cursor-pointer items-start gap-3 rounded-xl border p-3"
            style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
          >
            <input
              id="fb-consent-public"
              type="checkbox"
              checked={consentPublicDisplay}
              disabled={submitting}
              onChange={(e) => setConsentPublicDisplay(e.target.checked)}
              className="mt-1 size-4 shrink-0 rounded border accent-[var(--accent-primary)]"
            />
            <span className="text-sm leading-snug" style={{ color: 'var(--text-secondary)' }}>
              I&apos;m okay with InterviewEra sharing this feedback (with my first name only, never my
              email) publicly on the website or in marketing materials.
              <span className="mt-1 block text-xs" style={{ color: 'var(--text-muted)' }}>
                Optional — you can submit feedback either way.
              </span>
            </span>
          </label>
        ) : null}
      </div>

      <div
        className="flex flex-col-reverse gap-2 border-t p-5 sm:flex-row sm:justify-end sm:p-6"
        style={{ borderColor: 'var(--card-border)' }}
      >
        <Link
          href="/dashboard"
          className="inline-flex h-auto items-center justify-center rounded-[14px] border-2 px-4 py-2.5 text-sm font-semibold transition-colors"
          style={{
            borderColor: 'var(--card-border)',
            color: 'var(--text-primary)',
            background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
            pointerEvents: submitting ? 'none' : undefined,
            opacity: submitting ? 0.6 : undefined,
          }}
        >
          Back to dashboard
        </Link>
        <Button
          type="submit"
          disabled={submitting || screenshotUploading || (isTechnicalIssue && interviews.length === 0)}
          className={cn(IE_SUBMIT_BUTTON_CLASS, 'h-auto w-auto px-5 py-2.5 text-sm')}
          style={IE_SUBMIT_BUTTON_STYLE}
        >
          {submitting ? (
            <>
              <Loader2 className={IE_SPINNER_CLASS} aria-hidden />
              Sending…
            </>
          ) : screenshotUploading ? (
            'Waiting for upload…'
          ) : isTechnicalIssue ? (
            'Submit for review'
          ) : (
            'Send feedback'
          )}
        </Button>
      </div>
    </form>
  )
}
