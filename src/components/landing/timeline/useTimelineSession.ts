'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TIMELINE_QUESTION } from '@/lib/landing/timeline-content';
import type { TimelineStageIndex } from '@/lib/landing/timeline-content';

export type TimelineSessionState = {
  stage: TimelineStageIndex;
  reached: TimelineStageIndex;
  typed: number;
  timer: number;
  score: number;
  thinking: boolean;
  followVisible: boolean;
  talking: boolean;
  prep: number;
  resumeStep: 0 | 1 | 2;
};

const INITIAL_STATE: TimelineSessionState = {
  stage: 1,
  reached: 1,
  typed: 0,
  timer: 90,
  score: 0,
  thinking: false,
  followVisible: false,
  talking: false,
  prep: 0,
  resumeStep: 0,
};

const REDUCED_STATE: TimelineSessionState = {
  stage: 1,
  reached: 5,
  typed: TIMELINE_QUESTION.transcriptWords.length,
  timer: 46,
  score: 7.6,
  thinking: false,
  followVisible: true,
  talking: false,
  prep: 100,
  resumeStep: 2,
};

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function stageFromScroll(trackTop: number, trackHeight: number): TimelineStageIndex {
  const center = window.innerHeight / 2 - trackTop;
  const stageHeight = trackHeight / 5;
  const raw = 1 + Math.floor(center / stageHeight);
  return Math.max(1, Math.min(5, raw)) as TimelineStageIndex;
}

export function useTimelineSession() {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [desktopSticky, setDesktopSticky] = useState(false);
  const [state, setState] = useState<TimelineSessionState>(INITIAL_STATE);
  const doneRef = useRef<Record<string, boolean>>({});
  const timersRef = useRef<Array<ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>>>([]);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) {
      clearInterval(t as ReturnType<typeof setInterval>);
      clearTimeout(t as ReturnType<typeof setTimeout>);
    }
    timersRef.current = [];
  }, []);

  const kickStage = useCallback(
    (n: TimelineStageIndex) => {
      if (!desktopSticky || prefersReducedMotion()) return;

      const once = (key: string, fn: () => void) => {
        if (doneRef.current[key]) return;
        doneRef.current[key] = true;
        fn();
      };

      if (n >= 1) {
        once('prep', () => {
          const prepInterval = setInterval(() => {
            setState((s) => {
              if (s.prep >= 100) {
                clearInterval(prepInterval);
                return s;
              }
              return { ...s, prep: Math.min(100, s.prep + 4) };
            });
          }, 90);
          timersRef.current.push(prepInterval);

          const step1 = setTimeout(() => setState((s) => ({ ...s, resumeStep: 1 })), 1300);
          const step2 = setTimeout(() => setState((s) => ({ ...s, resumeStep: 2 })), 2900);
          timersRef.current.push(step1, step2);
        });
      }

      if (n >= 2) {
        once('timer', () => {
          const timerInterval = setInterval(() => {
            setState((s) => {
              if (s.stage >= 4 || s.timer <= 34) return s;
              return { ...s, timer: s.timer - 1 };
            });
          }, 1000);
          timersRef.current.push(timerInterval);
        });

        once('type', () => {
          setState((s) => ({ ...s, talking: true }));
          const talkEnd = setTimeout(() => setState((s) => ({ ...s, talking: false })), 1200);
          timersRef.current.push(talkEnd);

          const typeInterval = setInterval(() => {
            setState((s) => {
              if (s.typed >= TIMELINE_QUESTION.transcriptWords.length) {
                clearInterval(typeInterval);
                return s;
              }
              return { ...s, typed: s.typed + 1 };
            });
          }, 85);
          timersRef.current.push(typeInterval);
        });
      }

      if (n >= 3) {
        once('clamp', () => setState((s) => ({ ...s, timer: Math.min(s.timer, 48) })));

        once('follow', () => {
          setState((s) => ({ ...s, thinking: true }));
          const thinkEnd = setTimeout(() => {
            setState((s) => ({ ...s, thinking: false, followVisible: true, talking: true }));
            const talkEnd = setTimeout(() => setState((s) => ({ ...s, talking: false })), 3200);
            timersRef.current.push(talkEnd);
          }, 1600);
          timersRef.current.push(thinkEnd);
        });
      }

      if (n >= 4) {
        once('score', () => {
          const scoreInterval = setInterval(() => {
            setState((s) => {
              if (s.score >= 7.6) {
                clearInterval(scoreInterval);
                return { ...s, score: 7.6 };
              }
              return { ...s, score: Math.min(7.6, +(s.score + 0.25).toFixed(2)) };
            });
          }, 45);
          timersRef.current.push(scoreInterval);
        });
      }
    },
    [desktopSticky],
  );

  useEffect(() => {
    if (!prefersReducedMotion()) return;
    const frame = requestAnimationFrame(() => setState(REDUCED_STATE));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
    const sync = () => setDesktopSticky(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (!desktopSticky) return;

    const track = trackRef.current;
    if (!track) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const rect = track.getBoundingClientRect();
        const next = stageFromScroll(rect.top, rect.height);
        setState((prev) => {
          if (next === prev.stage) return prev;
          const reached = Math.max(prev.reached, next) as TimelineStageIndex;
          queueMicrotask(() => kickStage(next));
          return { ...prev, stage: next, reached };
        });
      });
    };

    onScroll();
    kickStage(1);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
      clearTimers();
    };
  }, [desktopSticky, kickStage, clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const setMobileStage = useCallback((stage: TimelineStageIndex) => {
    setState((prev) => ({
      ...prev,
      stage,
      reached: Math.max(prev.reached, stage) as TimelineStageIndex,
      ...(stage >= 2 ? { typed: TIMELINE_QUESTION.transcriptWords.length } : {}),
      ...(stage >= 3 ? { followVisible: true, thinking: false } : {}),
      ...(stage >= 4 ? { score: 7.6 } : {}),
      ...(stage >= 1 ? { prep: 100, resumeStep: 2 as const } : {}),
    }));
  }, []);

  return { trackRef, state, setMobileStage };
}
