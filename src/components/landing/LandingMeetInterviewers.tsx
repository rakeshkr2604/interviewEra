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

function AvatarIntroCard({
  interviewer,
  videoRef,
}: {
  interviewer: MeetInterviewer;
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
          poster={interviewer.posterSrc}
          aria-hidden
        >
          <source src={interviewer.videoSrc} type="video/mp4" />
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
            {interviewer.badge}
          </span>
        </div>
      </div>
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <h3
          className="m-0 font-[family-name:var(--font-bricolage)] text-lg font-bold tracking-tight sm:text-xl"
          style={{ color: 'var(--text-primary)' }}
        >
          {interviewer.name}
        </h3>
        <p className="m-0 mt-1 text-sm leading-relaxed sm:text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          {interviewer.roleLine}
        </p>
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
          <span className={LANDING_HOME_EYEBROW}>Meet your interviewers</span>
          <h2 id="meet-interviewers-heading" className={LANDING_HOME_HEADING}>
            Two practice personas, two round types
          </h2>
          <p className={LANDING_HOME_SUBHEAD}>
            Rohan and Meera introduce how InterviewEra splits HR behavioral practice from technical depth — same
            voice-led scored mock, tuned to the kind of panel you are preparing for.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:gap-8">
          {MEET_INTERVIEWERS.map((person, i) => (
            <AvatarIntroCard
              key={person.id}
              interviewer={person}
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
