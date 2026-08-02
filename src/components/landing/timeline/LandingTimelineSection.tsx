'use client';

import { useEffect, useRef } from 'react';
import {
  TIMELINE_INTRO,
  TIMELINE_SPINE_LABELS,
  TIMELINE_STAGE_COPY,
  type TimelineStageIndex,
} from '@/lib/landing/timeline-content';
import { LANDING_DEMO_DISCLOSURE } from '@/lib/landing/demo-disclosure';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { useTimelineSession } from '@/components/landing/timeline/useTimelineSession';
import {
  spineProgress,
  TimelineDeviceHeader,
  TimelineScreens,
} from '@/components/landing/timeline/TimelineScreens';
import { cn } from '@/lib/utils';
import './LandingTimeline.css';

function TimelineSpine({
  stage,
  reached,
}: {
  stage: TimelineStageIndex;
  reached: TimelineStageIndex;
}) {
  return (
    <div className="ie-tl-spine" aria-hidden>
      <div className="ie-tl-spine__track" />
      <div className="ie-tl-spine__fill" style={{ height: spineProgress(stage) }} />
      <ol className="ie-tl-spine__list">
        {TIMELINE_SPINE_LABELS.map((label, i) => {
          const n = (i + 1) as TimelineStageIndex;
          const active = stage === n;
          const seen = reached >= n;
          return (
            <li
              key={label}
              className={cn(
                'ie-tl-spine__item',
                active && 'ie-tl-spine__item--active',
                seen && 'ie-tl-spine__item--seen',
              )}
            >
              <span className="ie-tl-spine__dot" />
              <span className="ie-tl-spine__num">0{n}</span>
              <span className="ie-tl-spine__label">{label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TimelineStageCopyPanel({
  stage,
}: {
  stage: TimelineStageIndex;
}) {
  return (
    <div className="ie-tl-copy-stack">
      {TIMELINE_STAGE_COPY.map((copy) => (
        <article
          key={copy.index}
          className={cn('ie-tl-copy', stage === copy.index && 'ie-tl-copy--active')}
          aria-hidden={stage !== copy.index}
        >
          <p className="ie-tl-copy__kicker">{copy.kicker}</p>
          <h3 className="ie-tl-copy__title">{copy.title}</h3>
          <p className="ie-tl-copy__body">{copy.body}</p>
        </article>
      ))}
    </div>
  );
}

function MobileTimelineStage({
  stageIndex,
  onVisible,
}: {
  stageIndex: TimelineStageIndex;
  onVisible: (stage: TimelineStageIndex) => void;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const copy = TIMELINE_STAGE_COPY[stageIndex - 1];

  useEffect(() => {
    const node = ref.current;
    if (!node || !('IntersectionObserver' in window)) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onVisible(stageIndex);
      },
      { rootMargin: '-20% 0px', threshold: 0.35 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [onVisible, stageIndex]);

  return (
    <article ref={ref} className="ie-tl-mobile-stage" aria-labelledby={`tl-mobile-${stageIndex}`}>
      <div className="ie-tl-mobile-stage__meta">
        <span className="ie-tl-mobile-stage__num">0{stageIndex}</span>
        <span className="ie-tl-mobile-stage__label">{TIMELINE_SPINE_LABELS[stageIndex - 1]}</span>
      </div>
      <div className="ie-tl-mobile-stage__copy">
        <p className="ie-tl-copy__kicker">{copy.kicker}</p>
        <h3 id={`tl-mobile-${stageIndex}`} className="ie-tl-copy__title">
          {copy.title}
        </h3>
        <p className="ie-tl-copy__body">{copy.body}</p>
      </div>
    </article>
  );
}

export default function LandingTimelineSection() {
  const { trackRef, state, setMobileStage } = useTimelineSession();
  const videoVisible = state.stage === 2 || state.stage === 3;
  const showBars = state.reached >= 4;

  return (
    <section
      id="how"
      className="landing-timeline"
      aria-labelledby="landing-timeline-heading"
    >
      <div className={cn(LANDING_PAGE_CONTAINER, 'landing-timeline__container')}>
        <header className="landing-timeline__intro">
          <p className="landing-timeline__eyebrow">{TIMELINE_INTRO.eyebrow}</p>
          <h2 id="landing-timeline-heading" className="landing-timeline__headline">
            {TIMELINE_INTRO.headline}{' '}
            <em className="landing-timeline__headline-em">{TIMELINE_INTRO.headlineEmphasis}</em>
          </h2>
          <p className="landing-timeline__subhead">{TIMELINE_INTRO.body}</p>
        </header>

        <div ref={trackRef} className="landing-timeline__track landing-timeline__desktop">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="landing-timeline__sentinel" data-stage={i + 1} />
          ))}

          <div className="landing-timeline__sticky">
            <div className="landing-timeline__layout">
              <div className="landing-timeline__nav">
                <TimelineSpine stage={state.stage} reached={state.reached} />
                <TimelineStageCopyPanel stage={state.stage} />
              </div>

              <div className="landing-timeline__device" aria-live="polite">
                <TimelineDeviceHeader state={state} videoVisible={videoVisible} />
                <TimelineScreens state={state} showBars={showBars} />
              </div>
            </div>
          </div>
        </div>

        <div className="landing-timeline__mobile">
          <div className="landing-timeline__device landing-timeline__device--mobile">
            <TimelineDeviceHeader state={state} videoVisible={videoVisible} />
            <TimelineScreens state={state} showBars={showBars} />
          </div>

          <div className="landing-timeline__mobile-stages">
            {([1, 2, 3, 4, 5] as TimelineStageIndex[]).map((n) => (
              <MobileTimelineStage key={n} stageIndex={n} onVisible={setMobileStage} />
            ))}
          </div>
        </div>

        <p className="landing-timeline__disclosure">{LANDING_DEMO_DISCLOSURE}</p>
      </div>
    </section>
  );
}
