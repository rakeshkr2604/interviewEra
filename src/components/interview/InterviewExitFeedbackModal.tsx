'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, AlertCircle, X } from 'lucide-react';
import {
  EXIT_REASON_OPTIONS,
  TECHNICAL_ISSUE_OPTIONS,
  type ExitReasonOption,
  type TechnicalIssueOption,
} from '@/lib/validations/interview-exit-feedback';
import { trackProductEventClient } from '@/lib/analytics/product-events';
import { IE_FOCUS_VISIBLE } from '@/lib/theme/component-classes';

export interface InterviewExitFeedbackModalProps {
  isOpen: boolean;
  interviewId: string;
  questionIndex?: number | null;
  progressPercent?: number | null;
  engine?: string;
  onContinue: () => void;
  onLeave: () => void;
}

export function InterviewExitFeedbackModal({
  isOpen,
  interviewId,
  questionIndex = null,
  progressPercent = null,
  engine = 'script',
  onContinue,
  onLeave,
}: InterviewExitFeedbackModalProps) {
  const [selectedReason, setSelectedReason] = useState<ExitReasonOption | ''>('');
  const [selectedIssue, setSelectedIssue] = useState<TechnicalIssueOption | ''>('');
  const [otherText, setOtherText] = useState<string>('');
  const [comment, setComment] = useState<string>('');

  const [hasStartedFeedback, setHasStartedFeedback] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Track initial shown event once when modal opens
  const hasTrackedShown = useRef(false);
  useEffect(() => {
    if (isOpen && !hasTrackedShown.current) {
      hasTrackedShown.current = true;
      trackProductEventClient('interview_exit_feedback_shown', {
        interview_id: interviewId,
        engine,
      });
    }
  }, [isOpen, interviewId, engine]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onContinue();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onContinue]);

  const handleInteractionStart = useCallback(() => {
    if (!hasStartedFeedback) {
      setHasStartedFeedback(true);
      trackProductEventClient('interview_exit_feedback_started', {
        interview_id: interviewId,
        engine,
      });
    }
  }, [hasStartedFeedback, interviewId, engine]);

  const handleReasonSelect = (reason: ExitReasonOption) => {
    handleInteractionStart();
    setSelectedReason(reason);
    if (reason !== 'I ran into a technical problem') {
      setSelectedIssue('');
    }
    if (reason !== 'Other') {
      setOtherText('');
    }
    if (submitError) setSubmitError(null);
  };

  const handleIssueSelect = (issue: TechnicalIssueOption) => {
    handleInteractionStart();
    setSelectedIssue((prev) => (prev === issue ? '' : issue));
    if (submitError) setSubmitError(null);
  };

  const handleLeaveClick = async () => {
    // If the candidate selected no feedback reason and provided no comments, simply skip and leave
    const finalReason = selectedReason === 'Other' && otherText.trim() ? `Other: ${otherText.trim()}` : selectedReason;
    const hasAnyFeedback = Boolean(finalReason || comment.trim() || selectedIssue);

    if (!hasAnyFeedback) {
      trackProductEventClient('interview_exit_feedback_skipped', {
        interview_id: interviewId,
        engine,
      });
      // Fire non-blocking abandon call
      try {
        void fetch(`/api/interview/${interviewId}/abandon`, {
          method: 'POST',
          credentials: 'include',
          keepalive: true,
        });
      } catch {
        // Non-blocking
      }
      onLeave();
      return;
    }

    // If an error already occurred, let user leave immediately on next click without re-blocking
    if (submitError) {
      onLeave();
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        interviewId,
        exitReason: finalReason || 'Candidate left without specifying a reason',
        issueType: selectedIssue || '',
        comment: comment.trim(),
        questionIndex: typeof questionIndex === 'number' ? questionIndex : null,
        progressPercent: typeof progressPercent === 'number' ? progressPercent : null,
        engine,
        deviceInfo: typeof window !== 'undefined' ? {
          userAgent: navigator.userAgent,
          screenWidth: window.innerWidth,
          screenHeight: window.innerHeight,
        } : undefined,
      };

      const res = await fetch('/api/interview/exit-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Failed to save exit feedback.');
      }

      onLeave();
    } catch (err: unknown) {
      console.warn('[InterviewExitFeedbackModal] submit error:', err);
      trackProductEventClient('interview_exit_feedback_error', {
        interview_id: interviewId,
        engine,
      });
      setSubmitError("Couldn't save feedback. You can still leave.");
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-feedback-title"
      aria-describedby="exit-feedback-desc"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onContinue}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border shadow-2xl transition-all"
        style={{
          background: 'var(--card-bg, #ffffff)',
          borderColor: 'var(--card-border, #e5e7eb)',
          color: 'var(--text-primary, #111827)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b px-5 py-4" style={{ borderColor: 'var(--card-border, #e5e7eb)' }}>
          <div>
            <h2 id="exit-feedback-title" className="text-lg font-bold text-(--text-primary)">
              Leave this interview?
            </h2>
            <p id="exit-feedback-desc" className="mt-0.5 text-xs text-(--text-muted)">
              You have an interview in progress. If you leave now, this interview will be marked as
              abandoned. Optional: tell us what happened.
            </p>
          </div>
          <button
            type="button"
            onClick={onContinue}
            className={`rounded-lg p-1 text-(--text-muted) transition-colors hover:bg-(--bg-tertiary) hover:text-(--text-primary) ${IE_FOCUS_VISIBLE}`}
            aria-label="Close modal and continue interview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body - Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
          {/* Reason options */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) mb-2">
              Reason for leaving (optional)
            </legend>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {EXIT_REASON_OPTIONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <label
                    key={reason}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/80 text-purple-900 shadow-xs dark:bg-purple-950/30 dark:border-purple-500 dark:text-purple-200'
                        : 'border-(--card-border) bg-(--card-bg) text-(--text-primary) hover:border-purple-300 hover:bg-(--bg-tertiary)'
                    }`}
                  >
                    <input
                      type="radio"
                      name="exitReason"
                      value={reason}
                      checked={isSelected}
                      onChange={() => handleReasonSelect(reason)}
                      className="h-3.5 w-3.5 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="leading-tight">{reason}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Conditional: Other text input */}
          {selectedReason === 'Other' && (
            <div className="space-y-1 animate-fadeIn">
              <label htmlFor="other-reason-input" className="text-xs font-medium text-(--text-muted)">
                Please describe why you are leaving:
              </label>
              <input
                id="other-reason-input"
                type="text"
                maxLength={200}
                value={otherText}
                onChange={(e) => {
                  handleInteractionStart();
                  setOtherText(e.target.value);
                  if (submitError) setSubmitError(null);
                }}
                placeholder="Type your reason here..."
                className="w-full rounded-lg border border-(--card-border) bg-(--bg-secondary, #f9fafb) px-3 py-2 text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500 dark:bg-(--bg-tertiary)"
              />
            </div>
          )}

          {/* Conditional: Technical problem sub-options */}
          {selectedReason === 'I ran into a technical problem' && (
            <div className="space-y-2 rounded-xl border border-purple-200 bg-purple-50/40 p-3 dark:border-purple-900/50 dark:bg-purple-950/20 animate-fadeIn">
              <p className="text-xs font-semibold text-purple-900 dark:text-purple-200">
                What technical issue did you encounter?
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TECHNICAL_ISSUE_OPTIONS.map((issue) => {
                  const isSelected = selectedIssue === issue;
                  return (
                    <button
                      key={issue}
                      type="button"
                      onClick={() => handleIssueSelect(issue)}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                        isSelected
                          ? 'border-purple-600 bg-purple-600 text-white shadow-xs'
                          : 'border-(--card-border) bg-(--card-bg) text-(--text-muted) hover:border-purple-400 hover:text-(--text-primary)'
                      }`}
                    >
                      {issue}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional comment textarea */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-(--text-muted)">
              <label htmlFor="exit-comment" className="font-medium">
                Tell us more (optional)
              </label>
              <span>{comment.length}/500</span>
            </div>
            <textarea
              id="exit-comment"
              rows={2}
              maxLength={500}
              value={comment}
              onChange={(e) => {
                handleInteractionStart();
                setComment(e.target.value);
                if (submitError) setSubmitError(null);
              }}
              placeholder="Any additional feedback or suggestions..."
              className="w-full resize-none rounded-lg border border-(--card-border) bg-(--bg-secondary, #f9fafb) p-2.5 text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:border-purple-500 focus:outline-hidden focus:ring-1 focus:ring-purple-500 dark:bg-(--bg-tertiary)"
            />
          </div>

          {/* Error Banner */}
          {submitError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        {/* Footer CTAs */}
        <div className="flex items-center justify-between gap-3 border-t bg-(--bg-secondary, #f9fafb) px-5 py-3 dark:bg-(--bg-tertiary)" style={{ borderColor: 'var(--card-border, #e5e7eb)' }}>
          <button
            type="button"
            onClick={onContinue}
            disabled={isSubmitting}
            className={`rounded-xl border border-(--card-border) bg-(--card-bg) px-4 py-2 text-xs font-semibold text-(--text-primary) shadow-xs transition-colors hover:bg-(--bg-tertiary) disabled:opacity-50 ${IE_FOCUS_VISIBLE}`}
          >
            Continue interview
          </button>

          <button
            type="button"
            onClick={handleLeaveClick}
            disabled={isSubmitting}
            className={`flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-red-700 disabled:opacity-50 ${IE_FOCUS_VISIBLE}`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Leaving...</span>
              </>
            ) : (
              <span>{submitError ? 'Leave anyway' : 'Leave interview'}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
