'use client';

import { useEffect, useRef } from 'react';
import {
  LANDING_HOME_EYEBROW,
  LANDING_HOME_HEADER_BLOCK,
  LANDING_HOME_HEADING,
  LANDING_HOME_INNER,
  LANDING_HOME_SECTION,
  LANDING_HOME_SUBHEAD,
} from '@/lib/landing/container';
import { MEET_INTERVIEWERS, type MeetInterviewer } from '@/components/landing/LandingMeetInterviewers.data';
import { cn } from '@/lib/utils';
import './LandingMeetInterviewers.css';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function InterviewRoundCard({
  round,
  videoRef,
  onActivate,
  onDeactivate,
}: {
  round: MeetInterviewer;
  videoRef: (el: HTMLVideoElement | null) => void;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  return (
    <article
      className="ie-meet-card flex flex-col"
      onPointerEnter={onActivate}
      onPointerLeave={onDeactivate}
      onFocusCapture={onActivate}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onDeactivate();
      }}
    >
      <div className="ie-meet-media">
        <video
          ref={videoRef}
          src={round.videoSrc}
          poster={round.posterSrc}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden
        />
        <div
          className="ie-meet-badge absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1"
          style={{
            background: 'color-mix(in srgb, var(--bg-primary) 90%, transparent)',
            borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
          }}
        >
          <span
            className="ie-meet-badge-dot size-1.5 rounded-full bg-[var(--accent-danger)]"
            aria-hidden
          />
          <span className="text-[9px] font-bold tracking-[0.14em]" style={{ color: 'var(--accent-hover)' }}>
            {round.badge}
          </span>
        </div>
      </div>
      <div className="min-w-0 px-4 py-4 sm:px-5 sm:py-5">
        <h3
          className="m-0 text-balance font-[family-name:var(--font-bricolage)] text-lg font-bold tracking-tight sm:text-xl"
          style={{ color: 'var(--text-primary)' }}
        >
          {round.interviewType}
        </h3>
        <p className="m-0 mt-1 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          with {round.name}
        </p>
        <p className="m-0 mt-2.5 text-sm leading-relaxed sm:text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          {round.description}
        </p>
        <p
          className="m-0 mt-4 text-[10px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          {round.practiceLabel}
        </p>
        <ul className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0" aria-label={`${round.interviewType} topics`}>
          {round.topics.map((topic) => (
            <li
              key={topic}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium leading-tight',
                'border-[color-mix(in_srgb,var(--accent-primary)_22%,var(--card-border))]',
                'bg-[color-mix(in_srgb,var(--accent-primary)_6%,var(--card-bg))]',
              )}
              style={{ color: 'var(--text-secondary)' }}
            >
              {topic}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function LandingMeetInterviewers() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const inViewRef = useRef(false);
  const activeIndexRef = useRef<number | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const pauseAll = () => {
      for (const v of videoRefs.current) v?.pause();
    };

    const playActive = () => {
      if (prefersReducedMotion() || !inViewRef.current) {
        pauseAll();
        return;
      }
      const idx = activeIndexRef.current;
      videoRefs.current.forEach((v, i) => {
        if (!v) return;
        if (i === idx) {
          v.muted = true;
          void v.play().catch(() => {});
        } else {
          v.pause();
        }
      });
    };

    const onVisibility = (visible: boolean) => {
      inViewRef.current = visible;
      section.classList.toggle('is-in-view', visible);
      if (!visible) pauseAll();
      else playActive();
    };

    if (!('IntersectionObserver' in window)) {
      onVisibility(true);
      return () => pauseAll();
    }

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        onVisibility(entry.isIntersecting);
      },
      { root: null, rootMargin: '10% 0px', threshold: 0.15 },
    );
    io.observe(section);

    return () => {
      io.disconnect();
      pauseAll();
    };
  }, []);

  const activate = (index: number) => {
    activeIndexRef.current = index;
    if (prefersReducedMotion() || !inViewRef.current) return;
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === index) {
        v.muted = true;
        void v.play().catch(() => {});
      } else {
        v.pause();
      }
    });
  };

  const deactivate = (index: number) => {
    if (activeIndexRef.current !== index) return;
    activeIndexRef.current = null;
    videoRefs.current[index]?.pause();
  };

  return (
    <section
      ref={sectionRef}
      id="meet-interviewers"
      className={cn(LANDING_HOME_SECTION, 'ie-meet-interviewers')}
      aria-labelledby="meet-interviewers-heading"
    >
      <div className={LANDING_HOME_INNER}>
        <div className={LANDING_HOME_HEADER_BLOCK}>
          <span className={LANDING_HOME_EYEBROW}>Interview rounds</span>
          <h2 id="meet-interviewers-heading" className={LANDING_HOME_HEADING}>
            Practice different interview rounds
          </h2>
          <p className={LANDING_HOME_SUBHEAD}>
            Prepare for the rounds you&apos;ll face in campus placements and off-campus hiring — each
            Mock Interview style targets a different panel format.
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:gap-8">
          {MEET_INTERVIEWERS.map((round, i) => (
            <InterviewRoundCard
              key={round.id}
              round={round}
              videoRef={(el) => {
                videoRefs.current[i] = el;
              }}
              onActivate={() => activate(i)}
              onDeactivate={() => deactivate(i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
