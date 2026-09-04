'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Star, CheckCircle2, ArrowRight, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import {
  LIKED_ASPECT_OPTIONS,
  ISSUE_TYPE_OPTIONS,
  type LikedAspectOption,
  type IssueTypeOption,
} from '@/lib/validations/interview-feedback';
import { trackProductEventClient } from '@/lib/analytics/product-events';
import { IE_FOCUS_VISIBLE } from '@/lib/theme/component-classes';

export interface AfterInterviewFeedbackProps {
  interviewId: string;
  reportHref?: string | null;
  isReportReady?: boolean;
  reportError?: string | null;
  onRetryReport?: () => void;
  onContinueToReport?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Needs improvement',
  2: 'Fair',
  3: 'Good',
  4: 'Very good',
  5: 'Exceptional',
};

export function AfterInterviewFeedback({
  interviewId,
  reportHref,
  isReportReady = false,
  reportError = null,
  onRetryReport,
  onContinueToReport,
}: AfterInterviewFeedbackProps) {
  const router = useRouter();

  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [likedAspect, setLikedAspect] = useState<LikedAspectOption | ''>('');
  const [likedAspectOther, setLikedAspectOther] = useState<string>('');
  const [issueType, setIssueType] = useState<IssueTypeOption | ''>('');
  const [issueTypeOther, setIssueTypeOther] = useState<string>('');
  const [comment, setComment] = useState<string>('');

  const [hasStartedFeedback, setHasStartedFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSkipped, setIsSkipped] = useState(false);

  // Track initial shown event once
  const hasTrackedShown = useRef(false);
  useEffect(() => {
    if (!hasTrackedShown.current) {
      hasTrackedShown.current = true;
      trackProductEventClient('after_interview_feedback_shown', {
        interview_id: interviewId,
      });
    }
  }, [interviewId]);

  // Track started feedback on first interaction
  const handleInteractionStart = useCallback(() => {
    if (!hasStartedFeedback) {
      setHasStartedFeedback(true);
      trackProductEventClient('after_interview_feedback_started', {
        interview_id: interviewId,
      });
    }
  }, [hasStartedFeedback, interviewId]);

  const handleRatingSelect = (val: number) => {
    handleInteractionStart();
    setRating(val);
    if (submitError) setSubmitError(null);
  };

  const handleLikedSelect = (aspect: LikedAspectOption) => {
    handleInteractionStart();
    setLikedAspect((prev) => (prev === aspect ? '' : aspect));
    if (aspect !== 'Other') setLikedAspectOther('');
  };

  const handleIssueSelect = (issue: IssueTypeOption) => {
    handleInteractionStart();
    setIssueType((prev) => (prev === issue ? '' : issue));
    if (issue !== 'Other') setIssueTypeOther('');
  };

  const navigateToReport = useCallback(() => {
    if (onContinueToReport) {
      onContinueToReport();
    } else if (reportHref) {
      router.push(reportHref);
    }
  }, [onContinueToReport, reportHref, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1) {
      setSubmitError('Please select a star rating for your interview.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const finalLiked =
      likedAspect === 'Other'
        ? likedAspectOther.trim()
          ? `Other: ${likedAspectOther.trim()}`
          : 'Other'
        : likedAspect || '';

    const finalIssue =
      issueType === 'Other'
        ? issueTypeOther.trim()
          ? `Other: ${issueTypeOther.trim()}`
          : 'Other'
        : issueType || '';

    try {
      const res = await fetch('/api/interview/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId,
          rating,
          likedAspect: finalLiked,
          issueType: finalIssue,
          comment: comment.trim(),
          deviceInfo: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            screen:
              typeof window !== 'undefined'
                ? `${window.innerWidth}x${window.innerHeight}`
                : '',
          },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? 'Failed to submit feedback');
      }

      setIsSubmitted(true);
      trackProductEventClient('after_interview_feedback_submitted', {
        interview_id: interviewId,
        rating,
        liked_aspect: finalLiked || undefined,
        issue_type: finalIssue || undefined,
      });

      // If report is already ready, navigate immediately
      if (isReportReady && (reportHref || onContinueToReport)) {
        navigateToReport();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error. Please try again.';
      setSubmitError(msg);
      trackProductEventClient('after_interview_feedback_error', {
        interview_id: interviewId,
        error_message: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    trackProductEventClient('after_interview_feedback_skipped', {
      interview_id: interviewId,
    });
    setIsSkipped(true);
    if (isReportReady && (reportHref || onContinueToReport)) {
      navigateToReport();
    }
  };

  // If user skipped or already submitted, and report is ready -> auto-transition or show CTA
  useEffect(() => {
    if ((isSubmitted || isSkipped) && isReportReady && (reportHref || onContinueToReport)) {
      const timer = setTimeout(() => {
        navigateToReport();
      }, 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isSubmitted, isSkipped, isReportReady, reportHref, onContinueToReport, navigateToReport]);

  // ── Render: Waiting screen after submission or skip while report is generating ──
  if (isSubmitted || isSkipped) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-8 text-center animate-in fade-in duration-300">
        <div
          className="dashboard-premium-card rounded-2xl border p-6 sm:p-8"
          style={{
            borderColor: 'var(--card-border)',
            background: 'var(--card-bg)',
            boxShadow: 'var(--card-shadow)',
          }}
        >
          {isSubmitted ? (
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          ) : (
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-6 w-6" />
            </div>
          )}

          <h2 className="text-xl font-bold tracking-tight text-(--text-primary) sm:text-2xl">
            {isSubmitted ? 'Thank you for your feedback!' : 'Wrapping up your session'}
          </h2>

          <p className="mt-2 text-sm text-(--text-secondary)">
            {isReportReady
              ? 'Your comprehensive score report is ready.'
              : 'Our AI is synthesizing your answer evaluations and generating your report.'}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4">
            {isReportReady ? (
              <button
                type="button"
                onClick={navigateToReport}
                className={`inline-flex min-h-[48px] w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-(--accent-primary) px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:opacity-95 ${IE_FOCUS_VISIBLE}`}
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #818CF8)',
                }}
              >
                <span>View your interview report</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : reportError ? (
              <div className="w-full max-w-sm space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-left text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{reportError}</span>
                </div>
                {onRetryReport && (
                  <button
                    type="button"
                    onClick={onRetryReport}
                    className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-(--card-border) bg-(--bg-secondary) text-xs font-semibold text-(--text-primary) hover:bg-(--card-bg)"
                  >
                    Retry report generation
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="flex items-center gap-2 text-sm font-medium text-(--accent-primary)">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Preparing score report…</span>
                </div>
                <p className="text-xs text-(--text-muted)">
                  This usually takes around 10–15 seconds.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Interactive After Interview Feedback Form ──
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8 animate-in fade-in duration-300">
      <div
        className="dashboard-premium-card rounded-2xl border p-5 sm:p-7 shadow-sm transition-all"
        style={{
          borderColor: 'var(--card-border)',
          background: 'var(--card-bg)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {/* Header with celebration & report status */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interview Complete</span>
          </div>

          <h1 className="text-xl font-bold tracking-tight text-(--text-primary) sm:text-2xl">
            Your report is being prepared
          </h1>

          <p className="mt-1.5 max-w-md text-xs sm:text-sm text-(--text-secondary)">
            While our AI evaluates your answers, tell us how this interview felt.
          </p>

          {/* Dynamic Banner: Report is ready indicator */}
          {isReportReady && (
            <div className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3 text-left text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs sm:text-sm font-semibold">
                  Your report is ready to view!
                </span>
              </div>
              <button
                type="button"
                onClick={navigateToReport}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
              >
                <span>View report</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Question 1: 1-5 Star Rating */}
          <div className="rounded-xl border border-(--card-border)/80 bg-(--bg-secondary)/40 p-4 text-center">
            <label
              htmlFor="interview-rating-stars"
              className="block text-xs font-bold uppercase tracking-wider text-(--text-secondary)"
            >
              1. How was your interview experience?
            </label>

            <div
              id="interview-rating-stars"
              className="mt-3 flex items-center justify-center gap-2"
              role="radiogroup"
              aria-label="Overall interview rating 1 to 5 stars"
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={`${star} star${star > 1 ? 's' : ''}`}
                    tabIndex={0}
                    onClick={() => handleRatingSelect(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="touch-manipulation rounded-lg p-1.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-primary)"
                  >
                    <Star
                      className={`h-7 w-7 sm:h-8 sm:w-8 transition-colors ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-transparent text-(--card-border) hover:text-amber-300'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <p className="mt-2 min-h-[1.25rem] text-xs font-medium text-amber-700 dark:text-amber-400">
              {RATING_LABELS[hoverRating || rating] || 'Select rating'}
            </p>
          </div>

          {/* Question 2: What was most useful? */}
          <div className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-(--text-secondary)">
              2. What worked best? <span className="font-normal normal-case text-(--text-muted)">(optional)</span>
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {LIKED_ASPECT_OPTIONS.map((option) => {
                const isSelected = likedAspect === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleLikedSelect(option)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-(--accent-primary) bg-indigo-50 font-semibold text-(--accent-primary) dark:bg-indigo-950/40'
                        : 'border-(--card-border) bg-(--bg-secondary)/50 text-(--text-secondary) hover:border-(--accent-primary)/50 hover:text-(--text-primary)'
                    } ${IE_FOCUS_VISIBLE}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {likedAspect === 'Other' && (
              <div className="pt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <input
                  type="text"
                  value={likedAspectOther}
                  onChange={(e) => {
                    handleInteractionStart();
                    setLikedAspectOther(e.target.value);
                  }}
                  placeholder="Tell us what worked best for you..."
                  maxLength={190}
                  className="w-full rounded-xl border border-(--accent-primary)/60 bg-(--bg-secondary)/40 px-3.5 py-2 text-xs text-(--text-primary) outline-none transition placeholder:text-(--text-muted) focus:border-(--accent-primary) focus:bg-(--card-bg)"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Question 3: Did anything go wrong? */}
          <div className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-(--text-secondary)">
              3. Did anything go wrong? <span className="font-normal normal-case text-(--text-muted)">(optional)</span>
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {ISSUE_TYPE_OPTIONS.map((option) => {
                const isSelected = issueType === option;
                const isIssue = option !== 'No issues';
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleIssueSelect(option)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                      isSelected
                        ? isIssue
                          ? 'border-amber-400 bg-amber-50 font-semibold text-amber-800 dark:border-amber-600 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'border-emerald-400 bg-emerald-50 font-semibold text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border-(--card-border) bg-(--bg-secondary)/50 text-(--text-secondary) hover:border-amber-400/50 hover:text-(--text-primary)'
                    } ${IE_FOCUS_VISIBLE}`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            {issueType === 'Other' && (
              <div className="pt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <input
                  type="text"
                  value={issueTypeOther}
                  onChange={(e) => {
                    handleInteractionStart();
                    setIssueTypeOther(e.target.value);
                  }}
                  placeholder="Tell us what went wrong..."
                  maxLength={190}
                  className="w-full rounded-xl border border-amber-400/80 bg-(--bg-secondary)/40 px-3.5 py-2 text-xs text-(--text-primary) outline-none transition placeholder:text-(--text-muted) focus:border-amber-500 focus:bg-(--card-bg)"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Question 4: Optional short comment */}
          <div className="space-y-2">
            <label
              htmlFor="interview-feedback-comment"
              className="block text-xs font-bold uppercase tracking-wider text-(--text-secondary)"
            >
              4. Additional comments <span className="font-normal normal-case text-(--text-muted)">(optional)</span>
            </label>
            <textarea
              id="interview-feedback-comment"
              value={comment}
              onChange={(e) => {
                handleInteractionStart();
                setComment(e.target.value);
              }}
              placeholder="Any specifics on the questions, audio quality, or suggestions..."
              maxLength={2000}
              rows={2}
              className="w-full resize-none rounded-xl border border-(--card-border) bg-(--bg-secondary)/40 p-3 text-xs leading-relaxed text-(--text-primary) outline-none transition placeholder:text-(--text-muted) focus:border-(--accent-primary) focus:bg-(--card-bg)"
            />
          </div>

          {/* Submit error display */}
          {submitError && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex flex-col-reverse items-center justify-between gap-3 pt-2 sm:flex-row">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-semibold text-(--text-muted) transition hover:text-(--text-primary)"
            >
              {isReportReady ? 'Skip and view report →' : 'Skip feedback'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-(--accent-primary) px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${IE_FOCUS_VISIBLE}`}
              style={{
                background: 'linear-gradient(135deg, #6366F1, #818CF8)',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting…</span>
                </>
              ) : isReportReady ? (
                <>
                  <span>Submit & View Report</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <span>Submit Feedback</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
