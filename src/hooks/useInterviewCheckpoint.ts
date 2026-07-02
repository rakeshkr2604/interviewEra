'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { InterviewResumeSnapshotInput } from '@/lib/session/interview-resume-snapshot';

export function useInterviewCheckpoint(interviewId: string) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<InterviewResumeSnapshotInput | null>(null);

  const postCheckpoint = useCallback(
    async (payload: InterviewResumeSnapshotInput, keepalive = false) => {
      if (!interviewId) return;
      try {
        await fetch(`/api/interview/${interviewId}/checkpoint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          keepalive,
          body: JSON.stringify(payload),
        });
      } catch {
        /* best-effort */
      }
    },
    [interviewId],
  );

  const persistCheckpoint = useCallback(
    (payload: InterviewResumeSnapshotInput) => {
      latestRef.current = payload;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const snap = latestRef.current;
        if (snap) void postCheckpoint(snap);
      }, 400);
    },
    [postCheckpoint],
  );

  const flushCheckpoint = useCallback(
    (payload: InterviewResumeSnapshotInput) => {
      latestRef.current = payload;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      return postCheckpoint(payload, true);
    },
    [postCheckpoint],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const snap = latestRef.current;
      if (snap && interviewId) {
        void fetch(`/api/interview/${interviewId}/checkpoint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          keepalive: true,
          body: JSON.stringify(snap),
        }).catch(() => {});
      }
    };
  }, [interviewId]);

  return { persistCheckpoint, flushCheckpoint };
}
