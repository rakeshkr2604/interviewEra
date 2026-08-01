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
}: {
  round: MeetInterviewer;
  videoRef: (el: HTMLVideoElement | null) => void;
}) {
  return (
    <article className="ie-meet-card flex flex-col">
      <div className="ie-meet-media">
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
          poster={round.posterSrc}
          aria-hidden
        >
          <source src={round.videoSrc} type="video/mp4" />
        </video>
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

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const syncPlayback = (shouldPlay: boolean) => {
      if (prefersReducedMotion()) {
        for (const v of videoRefs.current) v?.pause();
        return;
      }
      for (const v of videoRefs.current) {
        if (!v) continue;
        if (shouldPlay) void v.play().catch(() => {});
        else v.pause();
      }
    };

    if (!('IntersectionObserver' in window)) {
      section.classList.add('is-in-view');
      syncPlayback(true);
      return () => syncPlayback(false);
    }

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        section.classList.toggle('is-in-view', entry.isIntersecting);
        syncPlayback(entry.isIntersecting);
      },
      { root: null, rootMargin: '10% 0px', threshold: 0.15 },
    );
    io.observe(section);

    return () => {
      io.disconnect();
      syncPlayback(false);
    };
  }, []);

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
            />
          ))}
        </div>
      </div>
    </section>
  );
}
