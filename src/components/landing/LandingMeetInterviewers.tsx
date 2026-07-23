'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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

function MuteIcon({ muted }: { muted: boolean }) {
  if (muted) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M11 5L6 9H2v6h4l5 4V5z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M23 9l-6 6M17 9l6 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M11 5L6 9H2v6h4l5 4V5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 8.5a5 5 0 010 7M19 5a9 9 0 010 14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AvatarIntroCard({
  interviewer,
  videoRef,
  muted,
  onToggleMute,
}: {
  interviewer: MeetInterviewer;
  videoRef: (el: HTMLVideoElement | null) => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  return (
    <article className="ie-meet-card flex flex-col">
      <div className="ie-meet-media">
        <video
          ref={videoRef}
          muted={muted}
          loop
          playsInline
          preload="none"
          poster={interviewer.posterSrc}
          // Decorative while muted; when unmuted, expose the spoken line.
          aria-hidden={muted}
          aria-label={muted ? undefined : `${interviewer.name}: ${interviewer.spokenLine}`}
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
        <button
          type="button"
          className="ie-meet-mute-btn absolute right-3 top-3"
          onClick={onToggleMute}
          aria-pressed={!muted}
          aria-label={muted ? `Unmute ${interviewer.name}` : `Mute ${interviewer.name}`}
        >
          <MuteIcon muted={muted} />
        </button>
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
        <p
          className="m-0 mt-2 text-[13px] leading-snug sm:text-sm"
          style={{ color: 'var(--text-muted)' }}
        >
          “{interviewer.spokenLine}”
        </p>
      </div>
    </article>
  );
}

export default function LandingMeetInterviewers() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [mutedById, setMutedById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(MEET_INTERVIEWERS.map((p) => [p.id, true])),
  );

  const syncPlayback = useCallback((shouldPlay: boolean) => {
    const reduce = prefersReducedMotion();
    for (const v of videoRefs.current) {
      if (!v) continue;
      // Reduced-motion: no autoplay. User unmute is a gesture and may start playback.
      if (reduce && shouldPlay) {
        v.pause();
        continue;
      }
      if (shouldPlay) void v.play().catch(() => {});
      else v.pause();
    }
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

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
  }, [syncPlayback]);

  // Keep DOM muted attribute in sync (React boolean + imperative for safety).
  useEffect(() => {
    MEET_INTERVIEWERS.forEach((person, i) => {
      const el = videoRefs.current[i];
      if (!el) return;
      el.muted = mutedById[person.id] ?? true;
    });
  }, [mutedById]);

  const toggleMute = (id: string, index: number) => {
    setMutedById((prev) => {
      const nextMuted = !(prev[id] ?? true);
      const el = videoRefs.current[index];
      if (el) {
        el.muted = nextMuted;
        // User gesture: allow play even under reduced-motion when unmuting.
        if (!nextMuted) void el.play().catch(() => {});
      }
      return { ...prev, [id]: nextMuted };
    });
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
          <span className={LANDING_HOME_EYEBROW}>Meet the practice personas</span>
          <h2 id="meet-interviewers-heading" className={LANDING_HOME_HEADING}>
            Two practice personas, two round types
          </h2>
          <p className={LANDING_HOME_SUBHEAD}>
            Rohan and Meera introduce how InterviewEra splits technical depth from HR behavioral practice — same
            voice-led scored mock, tuned to the kind of panel you are preparing for.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:mt-12 sm:grid-cols-2 sm:gap-6 lg:gap-8">
          {MEET_INTERVIEWERS.map((person, i) => (
            <AvatarIntroCard
              key={person.id}
              interviewer={person}
              muted={mutedById[person.id] ?? true}
              onToggleMute={() => toggleMute(person.id, i)}
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
