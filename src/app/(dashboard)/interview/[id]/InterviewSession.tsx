'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { QuestionCard } from '@/components/interview/QuestionCard';
import { VoiceAnswerInput } from '@/components/interview/VoiceAnswerInput';
import { ProgressBar } from '@/components/interview/ProgressBar';
import { AfterInterviewFeedback } from '@/components/interview/AfterInterviewFeedback';
import { InterviewExitFeedbackModal } from '@/components/interview/InterviewExitFeedbackModal';
import type { AnswerMode, Question } from '@/types/app.types';
import { readAnswerStyle } from '@/lib/settings/client-preferences';
import {
  TierUnlockCelebrationDialog,
  type TierCelebrationPayload,
} from '@/components/retention/TierUnlockCelebrationDialog';
import { trackMockInterviewCompletedGa4 } from '@/lib/analytics/funnel-ga4-bridge';
import type { FunnelCompleteGa4Payload } from '@/lib/analytics/funnel-ga4-bridge';
import type { InterviewCompleteRetentionPayload } from '@/lib/retention/interview-complete-retention';

type SessionState =
  | 'answering'
  | 'submitting'
  | 'completing'
  | 'done';

interface AnswerResult {
  evaluationId: string | null;
  score: number | null;
  feedback: string;
}

interface InterviewSessionProps {
  interviewId: string;
  questions: Question[];
  answeredCount: number; // allows resuming mid-session
}

export function InterviewSession({
  interviewId,
  questions,
  answeredCount,
}: InterviewSessionProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(answeredCount);
  const [sessionState, setSessionState] = useState<SessionState>('answering');
  const [lastResult, setLastResult] = useState<AnswerResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completingError, setCompletingError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<TierCelebrationPayload | null>(null);
  const [reportHref, setReportHref] = useState<string | null>(null);
  const [isReportReady, setIsReportReady] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  // Declared before handleSubmitAnswer so the reference is stable
  const completeInterview = useCallback(async () => {
    setCompletingError(null);
    try {
      const res = await fetch('/api/interview/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId }),
      });

      const data = (await res.json()) as {
        reportId?: string;
        error?: string;
        retention?: InterviewCompleteRetentionPayload | null;
        funnelComplete?: FunnelCompleteGa4Payload;
      };

      if (!res.ok || !data.reportId) {
        setCompletingError(
          data.error ?? 'Could not generate your report. Please try again.',
        );
        return;
      }

      const generatedReportHref = `/report/${data.reportId}`;
      setReportHref(generatedReportHref);
      setIsReportReady(true);

      if (data.funnelComplete) {
        void trackMockInterviewCompletedGa4(data.funnelComplete);
      }

      if (
        typeof window !== 'undefined' &&
        data.retention &&
        typeof data.retention.streak === 'number'
      ) {
        window.dispatchEvent(
          new CustomEvent('ie-streak-updated', { detail: { streak: data.retention.streak } }),
        );
      }

      if (
        data.retention?.tierUnlocked &&
        typeof data.retention.newTier === 'number' &&
        data.retention.newTier != null
      ) {
        setCelebration({
          newTier: data.retention.newTier,
          newBadges: [...(data.retention.newBadges ?? [])],
          reportHref: generatedReportHref,
          progressHint: data.retention.progress ?? null,
          nextTierNumber: data.retention.nextTierNumber ?? null,
          nextTierProgressPercent: data.retention.nextTierProgressPercent ?? 0,
        });
      }
    } catch {
      setCompletingError('Network error while generating report. Please try again.');
    }
  }, [interviewId]);

  const handleSubmitAnswer = useCallback(
    async (answerText: string, answerMode: AnswerMode) => {
      setSessionState('submitting');
      setError(null);

      try {
        const res = await fetch('/api/interview/answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            interviewId,
            questionId: currentQuestion.id,
            answerText,
            answerMode,
            answerStyle: readAnswerStyle(),
          }),
        });

        const data = (await res.json()) as {
          evaluationId?: string;
          score?: number;
          feedback?: string;
          error?: string;
        };

        if (!res.ok) {
          setError(data.error ?? 'Failed to submit answer. Please try again.');
          setSessionState('answering');
          return;
        }

        setLastResult({
          evaluationId: data.evaluationId ?? null,
          score: data.score ?? null,
          feedback: data.feedback ?? '',
        });

        if (isLastQuestion) {
          // All questions answered — trigger completion asynchronously
          setSessionState('completing');
          void completeInterview();
        } else {
          // Advance to next question
          setCurrentIndex((prev) => prev + 1);
          setLastResult(null);
          setSessionState('answering');
        }
      } catch {
        setError('Network error. Please check your connection and try again.');
        setSessionState('answering');
      }
    },
    [interviewId, currentQuestion, isLastQuestion, completeInterview],
  );

  const celebrationDialog = (
    <TierUnlockCelebrationDialog
      key={celebration ? `${celebration.newTier}-${celebration.reportHref}` : 'idle'}
      open={celebration !== null}
      onOpenChange={(open) => {
        if (!open) {
          const href = celebration?.reportHref;
          setCelebration(null);
          if (href) {
            router.push(href);
          }
        }
      }}
      data={celebration}
    />
  );

  const handleContinueToReport = useCallback(() => {
    if (celebration) {
      // Dialog is open or will trigger push on close
      return;
    }
    if (reportHref) {
      setSessionState('done');
      router.push(reportHref);
    }
  }, [celebration, reportHref, router]);

  if (!currentQuestion || currentIndex >= totalQuestions || sessionState === 'completing' || sessionState === 'done') {
    return (
      <>
        <div className="py-6 sm:py-10">
          <AfterInterviewFeedback
            interviewId={interviewId}
            reportHref={reportHref}
            isReportReady={isReportReady}
            reportError={completingError}
            onRetryReport={completeInterview}
            onContinueToReport={handleContinueToReport}
          />
        </div>
        {celebrationDialog}
      </>
    );
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[min(100%,960px)] space-y-6 px-4 py-8 lg:max-w-4xl lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <ProgressBar current={currentIndex + 1} total={totalQuestions} />
          </div>
          <button
            type="button"
            onClick={() => setIsExitModalOpen(true)}
            className="flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg border border-(--card-border) px-2.5 py-1.5 text-xs font-medium text-(--text-muted) transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
            aria-label="Exit interview"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>

        <QuestionCard
          key={currentQuestion.id}
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          totalQuestions={totalQuestions}
        />

        {/* Per-answer feedback (shown briefly before advancing) */}
        {lastResult && lastResult.feedback && (
          <div className="rounded-lg border bg-secondary/40 p-4 text-sm">
            {lastResult.score !== null && (
              <p className="mb-1 font-medium">
                Score:{' '}
                <span
                  className={
                    lastResult.score >= 7
                      ? 'text-green-600'
                      : lastResult.score >= 5
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }
                >
                  {lastResult.score.toFixed(1)} / 10
                </span>
              </p>
            )}
            <p className="text-muted-foreground">{lastResult.feedback}</p>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {completingError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {completingError}{' '}
            <button
              onClick={completeInterview}
              className="font-medium underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        <VoiceAnswerInput
          key={`answer-${currentQuestion.id}`}
          onSubmit={handleSubmitAnswer}
          isSubmitting={sessionState === 'submitting'}
        />
      </div>
      <InterviewExitFeedbackModal
        isOpen={isExitModalOpen}
        interviewId={interviewId}
        questionIndex={currentIndex + 1}
        progressPercent={Math.round((currentIndex / totalQuestions) * 100)}
        engine="standard"
        onContinue={() => setIsExitModalOpen(false)}
        onLeave={() => {
          setIsExitModalOpen(false);
          router.push('/dashboard');
        }}
      />
      {celebrationDialog}
    </>
  );
}
