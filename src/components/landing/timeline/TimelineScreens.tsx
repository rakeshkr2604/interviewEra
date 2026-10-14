'use client';

import { useEffect, useRef } from 'react';
import type { TimelineSessionState } from '@/components/landing/timeline/useTimelineSession';
import {
  TIMELINE_CONTEXT_BY_STAGE,
  TIMELINE_INSIGHT,
  TIMELINE_INTERVIEWER,
  TIMELINE_PRESSURE,
  TIMELINE_QUESTION,
  TIMELINE_READY,
  TIMELINE_RESUME,
  type TimelineStageIndex,
} from '@/lib/landing/timeline-content';
import { StartFreeCtaLink } from '@/components/analytics/StartFreeCtaLink';
import { cn } from '@/lib/utils';

const STAGE_COUNT = 5;
const RING_CIRCUMFERENCE = 150.8;

function inactiveScreenA11y(active: boolean) {
  return active ? {} : ({ 'aria-hidden': true, inert: true } as const);
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function sessionStatus(state: TimelineSessionState): string {
  const { stage, talking, typed, thinking, followVisible, score, resumeStep } = state;
  const done = typed >= TIMELINE_QUESTION.transcriptWords.length;

  if (stage === 1) {
    return ['Reading your resume…', 'Generating questions…', 'Interview ready'][resumeStep];
  }
  if (stage === 2) {
    if (talking || typed === 0) return 'Asking question 1…';
    if (!done) return 'Listening to your answer…';
    return 'Answer captured — generating follow-up';
  }
  if (stage === 3) {
    if (thinking) return 'Thinking about your answer…';
    if (talking) return 'Asking a follow-up…';
    if (followVisible) return 'Waiting — take your time';
    return 'Adaptive follow-up ready';
  }
  if (stage === 4) {
    return score < 7.6 ? 'Evaluating communication…' : 'Generating your report…';
  }
  return 'Session complete — you’re ready.';
}

function metaLabel(state: TimelineSessionState): string {
  const { stage, prep, score } = state;
  if (stage === 1) return `RESUME ANALYSIS · QUESTION GENERATION · ${prep}%`;
  if (stage === 2) return 'PROGRESS · QUESTION 1 / 4';
  if (stage === 3) return 'PROGRESS · QUESTION 2 / 4';
  if (stage === 4) return score >= 7.6 ? 'EVALUATION COMPLETE · 100%' : 'EVALUATING · 5 DIMENSIONS';
  return 'EVALUATION COMPLETE · 100%';
}

function metaWidth(state: TimelineSessionState): string {
  const { stage, prep, score } = state;
  if (stage === 1) return `${prep}%`;
  if (stage === 2) return '25%';
  if (stage === 3) return '50%';
  if (stage === 4) return `${Math.round((score / 7.6) * 100)}%`;
  return '100%';
}

type ScreenProps = {
  stage: TimelineStageIndex;
  active: boolean;
  state: TimelineSessionState;
  showBars: boolean;
};

export function TimelineResumeScreen({ stage, active, state }: ScreenProps) {
  return (
    <div
      className={cn('ie-tl-screen', active && 'ie-tl-screen--active')}
      data-stage={stage}
      {...inactiveScreenA11y(active)}
    >
      <div className="ie-tl-resume-file">
        <div className="ie-tl-resume-file__icon">PDF</div>
        <div className="ie-tl-resume-file__meta">
          <div className="ie-tl-resume-file__name">{TIMELINE_RESUME.fileName}</div>
          <div className="ie-tl-resume-file__sub">{TIMELINE_RESUME.fileMeta}</div>
        </div>
        <div className="ie-tl-resume-file__parsed">{TIMELINE_RESUME.parseTime}</div>
      </div>
      <div className="ie-tl-resume-fields">
        {TIMELINE_RESUME.fields.map((field) => (
          <div key={field.label} className="ie-tl-resume-field">
            <div className="ie-tl-kicker">{field.label}</div>
            <div className="ie-tl-resume-field__value">{field.value}</div>
          </div>
        ))}
      </div>
      <div className="ie-tl-kicker ie-tl-kicker--spaced">
        WHAT {TIMELINE_INTERVIEWER.name.toUpperCase()} NOTICED
      </div>
      <div className="ie-tl-tags">
        {TIMELINE_RESUME.tags.map((tag, i) => (
          <span
            key={tag}
            className="ie-tl-tag"
            style={{ transitionDelay: active ? `${0.15 + i * 0.15}s` : undefined }}
          >
            {tag}
          </span>
        ))}
        <span
          className="ie-tl-tag ie-tl-tag--warn"
          style={{ transitionDelay: active ? '0.8s' : undefined }}
        >
          {TIMELINE_RESUME.probeTag}
        </span>
      </div>
      {state.resumeStep >= 1 ? (
        <p className="sr-only">Resume parsed and questions generated</p>
      ) : null}
    </div>
  );
}

export function TimelineQuestionScreen({ stage, active, state }: ScreenProps) {
  const typedText = TIMELINE_QUESTION.transcriptWords.slice(0, state.typed).join(' ');
  const done = state.typed >= TIMELINE_QUESTION.transcriptWords.length;

  return (
    <div
      className={cn('ie-tl-screen', active && 'ie-tl-screen--active')}
      data-stage={stage}
      {...inactiveScreenA11y(active)}
    >
      <div className="ie-tl-question-prompt">&ldquo;{TIMELINE_QUESTION.prompt}&rdquo;</div>
      <div className="ie-tl-transcript">
        <div className="ie-tl-transcript__head">
          <span className="ie-tl-kicker">TRANSCRIPT · YOU</span>
          <span className={cn('ie-tl-mic', done && 'ie-tl-mic--captured')}>
            ● {done ? 'CAPTURED' : 'LISTENING'}
          </span>
        </div>
        <p className="ie-tl-transcript__body">
          {typedText}
          {!done && active ? <span className="ie-tl-caret" aria-hidden /> : null}
        </p>
      </div>
    </div>
  );
}

export function TimelinePressureScreen({ stage, active, state }: ScreenProps) {
  return (
    <div
      className={cn('ie-tl-screen', active && 'ie-tl-screen--active')}
      data-stage={stage}
      {...inactiveScreenA11y(active)}
    >
      <div className="ie-tl-pressure-head">
        <span className="ie-tl-pill">{TIMELINE_PRESSURE.badge}</span>
        <span className="ie-tl-pressure-context">{TIMELINE_PRESSURE.context}</span>
      </div>
      <div className="ie-tl-pressure-body">
        {state.thinking ? (
          <p className="ie-tl-thinking">
            <span className="ie-tl-thinking__dot" aria-hidden />
            {TIMELINE_PRESSURE.thinkingLabel}
          </p>
        ) : (
          <p className="ie-tl-followup">
            &ldquo;
            {TIMELINE_PRESSURE.followUpParts.map((part, i) => (
              <span
                key={part.text}
                className={cn(part.highlight && 'ie-tl-followup__highlight')}
                style={{
                  opacity: state.followVisible ? 1 : 0,
                  transitionDelay: state.followVisible ? `${0.05 + i * 0.3}s` : undefined,
                }}
              >
                {part.text}
              </span>
            ))}
            &rdquo;
          </p>
        )}
      </div>
      <p
        className="ie-tl-pressure-aside"
        style={{ opacity: state.followVisible ? 1 : 0 }}
      >
        {TIMELINE_PRESSURE.aside}
      </p>
    </div>
  );
}

export function TimelineInsightScreen({ stage, active, state, showBars }: ScreenProps) {
  return (
    <div
      className={cn('ie-tl-screen', active && 'ie-tl-screen--active')}
      data-stage={stage}
      {...inactiveScreenA11y(active)}
    >
      <div className="ie-tl-insight-head">
        <span className="ie-tl-kicker">{TIMELINE_INSIGHT.label}</span>
        <div className="ie-tl-insight-score">
          <span className="ie-tl-insight-score__value">{state.score.toFixed(1)}</span>
          <span className="ie-tl-insight-score__unit">/10</span>
        </div>
      </div>
      <div className="ie-tl-bars">
        {TIMELINE_INSIGHT.dimensions.map((dim, i) => (
          <div key={dim.label} className="ie-tl-bar-row">
            <span className="ie-tl-bar-row__label">{dim.label}</span>
            <div className="ie-tl-bar-row__track" role="presentation">
              <div
                className={cn(
                  'ie-tl-bar-row__fill',
                  'accent' in dim && dim.accent === 'success' && 'ie-tl-bar-row__fill--success',
                )}
                style={{
                  width: showBars ? `${dim.width}%` : '0%',
                  transitionDelay: showBars ? `${0.05 + i * 0.1}s` : undefined,
                }}
              />
            </div>
            <span
              className={cn(
                'ie-tl-bar-row__value',
                'accent' in dim && dim.accent === 'success' && 'ie-tl-text-success',
              )}
            >
              {dim.value}
            </span>
          </div>
        ))}
      </div>
      <p className="ie-tl-next-step">
        <span className="ie-tl-next-step__label">Next step:</span> {TIMELINE_INSIGHT.nextStep}
      </p>
    </div>
  );
}

export function TimelineReadyScreen({ stage, active }: ScreenProps) {
  return (
    <div
      className={cn('ie-tl-screen ie-tl-screen--ready', active && 'ie-tl-screen--active')}
      data-stage={stage}
      {...inactiveScreenA11y(active)}
    >
      <h3 className="ie-tl-ready__headline">
        {TIMELINE_READY.headline}{' '}
        <em className="ie-tl-ready__emphasis">{TIMELINE_READY.headlineEmphasis}</em>
      </h3>
      <p className="ie-tl-ready__body">{TIMELINE_READY.body}</p>
      <div className="ie-tl-ready__actions">
        <StartFreeCtaLink
          href="/signup"
          section="landing_timeline_ready"
          ctaText={TIMELINE_READY.cta}
          className="v3-btn-primary ie-tl-ready__cta"
          tabIndex={active ? undefined : -1}
        >
          {TIMELINE_READY.cta}
        </StartFreeCtaLink>
        <span className="ie-tl-ready__footnote">{TIMELINE_READY.footnote}</span>
      </div>
    </div>
  );
}

type DeviceHeaderProps = {
  state: TimelineSessionState;
  videoVisible: boolean;
};

export function TimelineDeviceHeader({ state, videoVisible }: DeviceHeaderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { stage, timer, talking, typed } = state;
  const done = typed >= TIMELINE_QUESTION.transcriptWords.length;
  const idx = stage - 1;
  const showWave = (stage === 2 || stage === 3) && (talking || (typed > 0 && !done));
  const ringOffset =
    stage === 1 ? RING_CIRCUMFERENCE : stage >= 4 ? 0 : RING_CIRCUMFERENCE * (1 - timer / 90);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.loop = true;

    if (!videoVisible) {
      if (!video.paused) video.pause();
      return;
    }

    const rate = talking ? 1 : 0.3;
    if (video.playbackRate !== rate) video.playbackRate = rate;
    if (video.paused) void video.play().catch(() => {});
  }, [talking, videoVisible]);

  return (
    <div className="ie-tl-device-header">
      <div className="ie-tl-avatar-wrap">
        <div
          className={cn(
            'ie-tl-avatar',
            stage === 3 && state.thinking && 'ie-tl-avatar--thinking',
            (talking || stage === 5) && 'ie-tl-avatar--active',
          )}
        >
          {videoVisible ? (
            <video
              ref={videoRef}
              className="ie-tl-avatar__video"
              src={TIMELINE_INTERVIEWER.videoSrc}
              poster={TIMELINE_INTERVIEWER.posterSrc}
              muted
              playsInline
              loop
              preload="none"
              aria-label={`${TIMELINE_INTERVIEWER.name}, your AI interviewer, live on video`}
            />
          ) : (
            <div
              className="ie-tl-avatar__photo"
              style={{ backgroundImage: `url('${TIMELINE_INTERVIEWER.avatarSrc}')` }}
              role="img"
              aria-label={`${TIMELINE_INTERVIEWER.name}, your AI interviewer`}
            />
          )}
          <div className="ie-tl-avatar__shade" aria-hidden />
          <div className={cn('ie-tl-wave', showWave && 'ie-tl-wave--active')} aria-hidden>
            {[10, 16, 7, 13].map((h, i) => (
              <span key={i} className="ie-tl-wave__bar" style={{ ['--h' as string]: `${h}px` }} />
            ))}
          </div>
        </div>
        <p className="ie-tl-avatar__name">
          {TIMELINE_INTERVIEWER.name}{' '}
          <span>· {TIMELINE_INTERVIEWER.role}</span>
        </p>
      </div>

      <div className="ie-tl-device-meta">
        <div>
          <div className="ie-tl-kicker">{TIMELINE_CONTEXT_BY_STAGE[idx]}</div>
          <div className="ie-tl-device-status">
            <span
              className={cn(
                'ie-tl-status-dot',
                stage === 3 && state.thinking && 'ie-tl-status-dot--warn',
                stage === 5 && 'ie-tl-status-dot--success',
              )}
              aria-hidden
            />
            <span>{sessionStatus(state)}</span>
          </div>
        </div>
        <div className="ie-tl-device-meta__progress">
          <div className="ie-tl-kicker">{metaLabel(state)}</div>
          <div className="ie-tl-progress">
            <div
              className={cn(
                'ie-tl-progress__fill',
                ((stage === 4 && state.score >= 7.6) || stage === 5) && 'ie-tl-progress__fill--success',
              )}
              style={{ width: metaWidth(state) }}
            />
          </div>
        </div>
      </div>

      <div className="ie-tl-timer" aria-label="Session timer">
        <div className="ie-tl-timer__ring">
          <svg width="54" height="54" viewBox="0 0 54 54" aria-hidden>
            <circle cx="27" cy="27" r="24" fill="none" strokeWidth="3" className="ie-tl-timer__track" />
            <circle
              cx="27"
              cy="27"
              r="24"
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              className={cn(
                'ie-tl-timer__arc',
                stage >= 4 && 'ie-tl-timer__arc--success',
                stage === 3 && 'ie-tl-timer__arc--warn',
              )}
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
            />
          </svg>
          <span className="ie-tl-timer__value">
            {stage === 1 ? '—' : stage >= 4 ? '0:00' : formatTimer(timer)}
          </span>
        </div>
        <span className="ie-tl-kicker">
          {stage === 1 ? 'STANDBY' : stage >= 4 ? 'COMPLETED' : 'TO ANSWER'}
        </span>
      </div>
    </div>
  );
}

export function TimelineScreens({
  state,
  showBars,
}: {
  state: TimelineSessionState;
  showBars: boolean;
}) {
  const props = { state, showBars } as const;

  return (
    <div className="ie-tl-screens">
      <TimelineResumeScreen stage={1} active={state.stage === 1} {...props} />
      <TimelineQuestionScreen stage={2} active={state.stage === 2} {...props} />
      <TimelinePressureScreen stage={3} active={state.stage === 3} {...props} />
      <TimelineInsightScreen stage={4} active={state.stage === 4} {...props} />
      <TimelineReadyScreen stage={5} active={state.stage === 5} {...props} />
    </div>
  );
}

/**
 * Renders a single stage screen, always active.
 *
 * Mobile gives each stage its own section, so there is no crossfade stack to
 * manage — the screen is the only one in its card.
 */
export function TimelineStageScreen({
  stage,
  state,
  showBars,
}: {
  stage: TimelineStageIndex;
  state: TimelineSessionState;
  showBars: boolean;
}) {
  const props = { stage, active: true, state, showBars } as const;

  switch (stage) {
    case 1:
      return <TimelineResumeScreen {...props} />;
    case 2:
      return <TimelineQuestionScreen {...props} />;
    case 3:
      return <TimelinePressureScreen {...props} />;
    case 4:
      return <TimelineInsightScreen {...props} />;
    default:
      return <TimelineReadyScreen {...props} />;
  }
}

export function spineProgress(stage: TimelineStageIndex): string {
  return `${((stage - 1) / (STAGE_COUNT - 1)) * 100}%`;
}
