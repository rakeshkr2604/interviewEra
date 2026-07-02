'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Star, Loader2, MessageSquarePlus } from 'lucide-react'
import { collectFeedbackContext, type FeedbackSessionContext } from '@/lib/feedback/collect-context'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScreenshotUploader } from '@/components/feedback/ScreenshotUploader'
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

type WouldUse = boolean | null

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
  return (
    <div
      className="flex items-center gap-1.5"
      role="radiogroup"
      aria-label="Overall rating, 1 to 5"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onFocus={() => setHover(n)}
          onClick={() => onChange(n)}
          className="rounded-md p-1 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Star
            className={cn('size-7 transition-colors', n <= active ? 'fill-amber-400' : 'fill-transparent')}
            style={{ color: n <= active ? '#f59e0b' : 'var(--text-muted)' }}
            strokeWidth={1.75}
          />
        </button>
      ))}
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

export function FeedbackForm({ defaultName = '' }: { defaultName?: string }) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [name, setName] = useState(defaultName)
  const [rating, setRating] = useState(0)
  const [liked, setLiked] = useState('')
  const [confusion, setConfusion] = useState('')
  const [bugs, setBugs] = useState('')
  const [wouldUse, setWouldUse] = useState<WouldUse>(null)
  const [npsScore, setNpsScore] = useState<number | null>(null)
  const [feedbackCategory, setFeedbackCategory] = useState<
    'general' | 'bug' | 'feature' | 'interview' | 'report' | 'ai_quality'
  >('general')
  const [screenshotPath, setScreenshotPath] = useState<string | null>(null)
  const [screenshotUploading, setScreenshotUploading] = useState(false)
  // Bumping this key remounts the uploader, clearing its internal state on reset.
  const [uploaderKey, setUploaderKey] = useState(0)
  // Collected once when the dialog opens; cached so submit has no async delay.
  const [sessionCtx, setSessionCtx] = useState<FeedbackSessionContext | null>(null)

  // Kick off context collection the moment the dialog opens.
  useEffect(() => {
    if (!open) return
    collectFeedbackContext()
      .then(setSessionCtx)
      .catch(() => { /* non-fatal — feedback still submits without context */ })
  }, [open])

  function reset() {
    setName(defaultName)
    setRating(0)
    setLiked('')
    setConfusion('')
    setBugs('')
    setWouldUse(null)
    setNpsScore(null)
    setFeedbackCategory('general')
    setScreenshotPath(null)
    setScreenshotUploading(false)
    setUploaderKey((k) => k + 1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return // guard against double submission

    if (screenshotUploading) {
      toast.error('Hang on — your screenshot is still uploading.')
      return
    }
    if (rating < 1) {
      toast.error('Please pick a star rating first.')
      return
    }
    if (!liked.trim() && !confusion.trim() && !bugs.trim() && !screenshotPath) {
      toast.error('Add at least one note or a screenshot so we know what to improve.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || defaultName,
          rating,
          likedText: liked,
          confusionText: confusion,
          bugsText: bugs,
          wouldUseAgain: wouldUse,
          npsScore,
          feedbackCategory,
          pageUrl: typeof window !== 'undefined' ? window.location.href : '',
          browserInfo: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          ...(screenshotPath ? { screenshotPath } : {}),
          ...(sessionCtx ? { sessionContext: sessionCtx } : {}),
        }),
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        toast.error(data?.error || 'Something went wrong. Please try again.')
        return
      }

      toast.success('Thanks for your feedback. We review every submission.')
      reset()
      setOpen(false)
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Don't allow closing mid-submit so the request isn't visually abandoned.
        if (submitting && !next) return
        setOpen(next)
      }}
    >
      <DialogTrigger
        render={
          <Button
            className="landing-cta-lift h-auto rounded-[14px] px-4 py-2.5 text-sm font-semibold text-white"
            style={{
              background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
              boxShadow: '0 16px 48px color-mix(in srgb, var(--accent-primary) 32%, transparent)',
            }}
          />
        }
      >
        <MessageSquarePlus className="size-4" aria-hidden />
        Share feedback
      </DialogTrigger>

      <DialogContent
        showCloseButton={!submitting}
        className="max-h-[calc(100dvh-2rem)] w-full overflow-y-auto p-0 sm:max-w-lg"
        style={{ background: 'var(--card-bg)', borderColor: 'var(--card-border)' }}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader className="gap-1.5 border-b p-5 sm:p-6" style={{ borderColor: 'var(--card-border)' }}>
            <DialogTitle className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Share your feedback
            </DialogTitle>
            <DialogDescription className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              It goes straight to the founder. We read every submission.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 p-5 sm:p-6">
            {/* Rating */}
            <div className={IE_FIELD_GROUP_CLASS}>
              <FieldLabel htmlFor="fb-rating">Overall rating</FieldLabel>
              <RatingPicker value={rating} onChange={setRating} disabled={submitting} />
            </div>

            {/* Name */}
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

            <FeedbackTextarea
              id="fb-liked"
              label="What did you like?"
              value={liked}
              onChange={setLiked}
              disabled={submitting}
              placeholder="The part that worked well for you…"
            />
            <FeedbackTextarea
              id="fb-confusion"
              label="What confused you?"
              value={confusion}
              onChange={setConfusion}
              disabled={submitting}
              placeholder="Anything unclear or harder than it should be…"
            />
            <FeedbackTextarea
              id="fb-bugs"
              label="Bugs or issues?"
              value={bugs}
              onChange={setBugs}
              disabled={submitting}
              placeholder="What broke, and what were you doing at the time…"
            />

            {/* Would use again */}
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

            <div className={IE_FIELD_GROUP_CLASS}>
              <FieldLabel htmlFor="fb-category">Feedback type</FieldLabel>
              <select
                id="fb-category"
                value={feedbackCategory}
                disabled={submitting}
                onChange={(e) =>
                  setFeedbackCategory(
                    e.target.value as typeof feedbackCategory,
                  )
                }
                className={IE_INPUT_TOOL_CLASS}
                style={IE_FIELD_SURFACE_STYLE}
              >
                <option value="general">General</option>
                <option value="feature">Feature request</option>
                <option value="bug">Bug report</option>
                <option value="interview">Interview experience</option>
                <option value="report">Report usefulness</option>
                <option value="ai_quality">AI answer quality</option>
              </select>
            </div>

            <div className={IE_FIELD_GROUP_CLASS}>
              <FieldLabel htmlFor="fb-nps">NPS (0–10, optional)</FieldLabel>
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

            {/* Screenshot */}
            <ScreenshotUploader
              key={uploaderKey}
              disabled={submitting}
              onUploadingChange={setScreenshotUploading}
              onUploaded={setScreenshotPath}
              onCleared={() => setScreenshotPath(null)}
            />
          </div>

          <div
            className="flex flex-col-reverse gap-2 border-t p-5 sm:flex-row sm:justify-end sm:p-6"
            style={{ borderColor: 'var(--card-border)' }}
          >
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => setOpen(false)}
              className="h-auto rounded-[14px] px-4 py-2.5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || screenshotUploading}
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
              ) : (
                'Send feedback'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FeedbackTextarea({
  id,
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  return (
    <div className={IE_FIELD_GROUP_CLASS}>
      <div className="flex items-center justify-between">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {value.length}/{MAX_TEXT}
        </span>
      </div>
      <Textarea
        id={id}
        value={value}
        maxLength={MAX_TEXT}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={IE_TEXTAREA_TOOL_CLASS}
        style={IE_FIELD_SURFACE_STYLE}
      />
    </div>
  )
}
