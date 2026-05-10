'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { QuestionCard } from '@/components/interview/QuestionCard';
import { VoiceAnswerInput } from '@/components/interview/VoiceAnswerInput';
import { ProgressBar } from '@/components/interview/ProgressBar';
import type { AnswerMode, Question } from '@/types/app.types';
import { readAnswerStyle } from '@/lib/settings/client-preferences';

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

      const data = (await res.json()) as { reportId?: string; error?: string };

      if (!res.ok || !data.reportId) {
        setCompletingError(
          data.error ?? 'Could not generate your report. Please try again.'
        );
        setSessionState('answering'); // allow retry via UI
        return;
      }

      setSessionState('done');
      router.push(`/report/${data.reportId}`);
    } catch {
      setCompletingError('Network error while generating report. Please try again.');
      setSessionState('answering');
    }
  }, [interviewId, router]);

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
          // All questions answered — complete the interview
          setSessionState('completing');
          await completeInterview();
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
    [interviewId, currentQuestion, isLastQuestion, completeInterview]
  );

  if (!currentQuestion || currentIndex >= totalQuestions) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <h2 className="text-xl font-semibold">Generating your report…</h2>
        <p className="mt-2 text-muted-foreground">
          All questions answered. Wrapping up your interview.
        </p>
      </div>
    );
  }

  if (sessionState === 'completing' || sessionState === 'done') {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <h2 className="text-xl font-semibold">Generating your report…</h2>
        <p className="mt-2 text-muted-foreground">
          Our AI is analyzing your answers. This takes about 10–15 seconds.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[min(100%,960px)] space-y-6 px-4 py-8 lg:max-w-4xl lg:px-8">
      <ProgressBar current={currentIndex + 1} total={totalQuestions} />

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
  );
}
