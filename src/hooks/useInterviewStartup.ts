'use client';

import { useCallback, useMemo, useState } from 'react';

export type InterviewStartupPhase =
  | 'idle'
  | 'uploading_resume'
  | 'extracting_resume'
  | 'analyzing_resume'
  | 'generating_questions'
  | 'interview_ready'
  | 'failed';

type ResumeProcessingState = 'idle' | 'uploading' | 'processing' | 'parsed' | 'failed';

const RESUME_TO_STARTUP: Record<ResumeProcessingState, InterviewStartupPhase> = {
  idle: 'idle',
  uploading: 'uploading_resume',
  processing: 'analyzing_resume',
  parsed: 'idle',
  failed: 'failed',
};

export function useInterviewStartup() {
  const [phase, setPhase] = useState<InterviewStartupPhase>('idle');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const syncFromResume = useCallback((resumeState: ResumeProcessingState, statusMessage?: string) => {
    setPhase(RESUME_TO_STARTUP[resumeState]);
    if (statusMessage) setMessage(statusMessage);
    if (resumeState !== 'failed') setError('');
  }, []);

  const setExtracting = useCallback((msg?: string) => {
    setPhase('extracting_resume');
    if (msg) setMessage(msg);
  }, []);

  const setGeneratingQuestions = useCallback((msg?: string) => {
    setPhase('generating_questions');
    setMessage(msg ?? 'Preparing your interview…');
    setError('');
  }, []);

  const setReady = useCallback(() => {
    setPhase('interview_ready');
    setMessage('');
    setError('');
  }, []);

  const setFailed = useCallback((err: string) => {
    setPhase('failed');
    setError(err);
  }, []);

  const label = useMemo(() => {
    switch (phase) {
      case 'uploading_resume':
        return message || 'Uploading your resume…';
      case 'extracting_resume':
        return message || 'Reading your file…';
      case 'analyzing_resume':
        return message || 'Analyzing your resume…';
      case 'generating_questions':
        return message || 'Preparing your interview…';
      case 'interview_ready':
        return 'Ready to start';
      case 'failed':
        return error || 'Something went wrong';
      default:
        return '';
    }
  }, [phase, message, error]);

  return {
    phase,
    label,
    error,
    syncFromResume,
    setExtracting,
    setGeneratingQuestions,
    setReady,
    setFailed,
    setMessage,
  };
}
