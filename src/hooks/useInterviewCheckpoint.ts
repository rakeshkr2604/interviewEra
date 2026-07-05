'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { InterviewResumeSnapshotInput } from '@/lib/session/interview-resume-snapshot';

export function useInterviewCheckpoint(interviewId: string) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef<InterviewResumeSnapshotInput | null>(null);
  const enabledRef = useRef(true);

  const setCheckpointEnabled = useCallback((enabled: boolean) => {
    enabledRef.current = enabled;
  }, []);

  const postCheckpoint = useCallback(
    async (payload: InterviewResumeSnapshotInput, keepalive = false) => {
      if (!interviewId || !enabledRef.current) return;
      try {
        const res = await fetch(`/api/interview/${interviewId}/checkpoint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          keepalive,
          body: JSON.stringify(payload),
        });
        // Terminal interview — stop spamming console on completed/abandoned sessions.
        if (res.status === 409) return;
      } catch {
        /* best-effort */
      }
    },
    [interviewId],
  );

  const persistCheckpoint = useCallback(
    (payload: InterviewResumeSnapshotInput) => {
      if (!enabledRef.current) return;
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
      if (!enabledRef.current) return Promise.resolve();
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
      if (snap && interviewId && enabledRef.current) {
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

  return { persistCheckpoint, flushCheckpoint, setCheckpointEnabled };
}
