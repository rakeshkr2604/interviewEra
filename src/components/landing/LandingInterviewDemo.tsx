import { Captions, CircleDot } from 'lucide-react';
import {
  LANDING_HOME_EYEBROW,
  LANDING_HOME_HEADER_BLOCK,
  LANDING_HOME_HEADING,
  LANDING_HOME_SECTION,
  LANDING_HOME_SUBHEAD,
  LANDING_PAGE_CONTAINER,
} from '@/lib/landing/container';
import { cn } from '@/lib/utils';

/**
 * Interview simulation showcase — communicates "this is not a static question bank".
 *
 * Color system:
 *   accent-primary (blue)   → interviewer questions, neutral interview flow
 *   accent-success (green)  → system events, live indicators, high scores
 *   accent-warning (amber)  → challenge / pressure moments, weak scores
 *
 * Server-rendered. No fake interactivity, no animation gimmicks.
 */

type Turn = {
  who: 'interviewer' | 'candidate';
  label: string;
  sublabel?: string;
  text: string;
  /** true = challenge follow-up → amber treatment */
  highlight?: boolean;
};

type SignalRow = {
  who: 'signal';
  text: string;
  tag: string;
};

type ConversationItem = Turn | SignalRow;

const ITEMS: ConversationItem[] = [
  {
    who: 'interviewer',
    label: 'Interviewer',
    text: 'You mentioned a caching layer that cut API latency. What were you caching, and what could go stale?',
  },
  {
    who: 'candidate',
    label: 'You',
    text: 'We cached product-catalog responses in Redis with a 5-minute TTL, and invalidated those keys on every price write.',
  },
  {
    who: 'signal',
    text: 'Response received · Technical claim detected',
    tag: 'Follow-up queued',
  },
  {
    who: 'interviewer',
    label: 'Adaptive follow-up',
    sublabel: '↳ Challenge · Redis TTL + write-invalidation race',
    text: 'A 5-minute TTL plus write-invalidation can still race. How would you stop a stale price showing right after an update?',
    highlight: true,
  },
];

const CAPTION_WORDS =
  'We cached product catalog responses in Redis with a five minute TTL and invalidated'.split(' ');
const CAPTION_ACTIVE = 11;

const WAVEFORM_HEIGHTS = [5, 9, 6, 11, 4, 8, 5, 10, 7] as const;

const SCORES = [
  { name: 'Structured communication', val: 7.4, pct: 74 },
  { name: 'Technical depth', val: 8.1, pct: 81 },
  { name: 'Answer structure', val: 8.6, pct: 86 },
  { name: 'Delivery composure', val: 6.8, pct: 68 },
  { name: 'Response relevance', val: 8.2, pct: 82 },
] as const;

export function LandingInterviewDemo() {
  return (
    <section className={LANDING_HOME_SECTION}>
      <div className={LANDING_PAGE_CONTAINER}>
        <div className={LANDING_HOME_HEADER_BLOCK}>
          <span className={LANDING_HOME_EYEBROW}>A live session, not a list</span>
          <h2 className={LANDING_HOME_HEADING}>
            Weak or vague answers trigger follow-ups — just like a real interviewer
          </h2>
          <p className={LANDING_HOME_SUBHEAD}>
            Every question comes from your resume, and every follow-up comes from what you just said.
            Practise the second question now so you stop freezing when it lands in the room.
          </p>
        </div>

        <div className="ie-lh-surface-88 mx-auto mt-12 max-w-5xl overflow-hidden rounded-2xl border">
          <div className="ie-lh-demo-header flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6">
            <div className="flex items-center gap-2.5">
              <span className="ie-lh-text-success inline-flex items-center gap-1.5 text-xs font-semibold">
                <CircleDot className="size-3.5" aria-hidden />
                Live
              </span>
              <span className="ie-lh-text-muted text-xs font-medium">
                Backend Engineer · Technical round
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="ie-lh-text-muted text-[10px] font-medium">Q 3 / 6</span>
              <span className="ie-lh-text-muted font-mono text-xs">04:12</span>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.5fr_1fr]">
            <div className="ie-lh-border-card space-y-3.5 border-b p-5 sm:p-7 lg:border-b-0 lg:border-r">
              {ITEMS.map((item, i) => {
                if (item.who === 'signal') {
                  return (
                    <div
                      key={i}
                      className="ie-lh-signal-band flex items-center justify-between gap-2 rounded-lg px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span
                          className="ie-lh-bg-success inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                          aria-hidden
                        />
                        <span className="ie-lh-text-muted truncate text-[10px] font-medium">
                          {item.text}
                        </span>
                      </div>
                      <span className="ie-lh-signal-tag shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold">
                        {item.tag}
                      </span>
                    </div>
                  );
                }

                const isInterviewer = item.who === 'interviewer';
                const isChallenge = !!item.highlight;

                return (
                  <div
                    key={i}
                    className={isInterviewer ? 'flex flex-col items-start' : 'flex flex-col items-end'}
                  >
                    <div
                      className={`mb-1 flex flex-col px-1 ${isInterviewer ? 'items-start' : 'items-end'}`}
                    >
                      <span
                        className={cn(
                          'text-[10px] font-bold uppercase tracking-wider',
                          isChallenge
                            ? 'ie-lh-text-warning'
                            : isInterviewer
                              ? 'ie-lh-text-accent-hover'
                              : 'ie-lh-text-muted',
                        )}
                      >
                        {item.label}
                      </span>
                      {item.sublabel ? (
                        <span className="ie-lh-text-warning text-[10px] leading-tight opacity-75">
                          {item.sublabel}
                        </span>
                      ) : null}
                    </div>

                    <p
                      className={cn(
                        'max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                        isChallenge
                          ? 'ie-lh-bubble-challenge'
                          : isInterviewer
                            ? 'ie-lh-bubble-interviewer'
                            : 'ie-lh-bubble-candidate',
                      )}
                    >
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-5 p-5 sm:p-7">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="ie-lh-text-muted flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                    <Captions className="size-3.5" aria-hidden />
                    Live transcript
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="ie-lh-text-success text-[10px] font-semibold">● Speaking</span>
                    <div className="flex items-end gap-px" aria-hidden>
                      {WAVEFORM_HEIGHTS.map((h, i) => (
                        <div
                          key={i}
                          className="ie-lh-bg-success w-px rounded-full"
                          style={{
                            height: h,
                            opacity: 0.35 + (i % 3) * 0.12,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <p className="ie-lh-caption-box rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed">
                  {CAPTION_WORDS.map((w, i) => (
                    <span
                      key={i}
                      className={
                        i < CAPTION_ACTIVE
                          ? 'ie-lh-text-primary'
                          : i === CAPTION_ACTIVE
                            ? 'ie-lh-text-accent font-bold'
                            : 'ie-lh-text-muted'
                      }
                    >
                      {w}{' '}
                    </span>
                  ))}
                </p>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="ie-lh-text-muted text-[10px] font-bold uppercase tracking-wider">
                    Response analysis
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="ie-lh-text-success flex items-center gap-1 text-[10px] font-medium">
                      <span
                        className="ie-lh-bg-success inline-block h-1.5 w-1.5 rounded-full"
                        aria-hidden
                      />
                      Updating
                    </span>
                    <span className="ie-lh-text-success font-mono text-sm font-bold">7.8 / 10</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {SCORES.map((s) => {
                    const isWeak = s.val < 7;
                    const color = isWeak ? 'var(--accent-warning)' : 'var(--accent-success)';

                    return (
                      <div
                        key={s.name}
                        className={isWeak ? 'ie-lh-score-weak -mx-2.5 rounded-lg px-2.5 py-2' : ''}
                      >
                        <div
                          className={cn(
                            'flex items-center justify-between text-xs',
                            isWeak ? 'ie-lh-text-primary' : 'ie-lh-text-secondary',
                          )}
                        >
                          <span className={isWeak ? 'font-medium' : ''}>{s.name}</span>
                          <span className="font-mono font-semibold" style={{ color }}>
                            {s.val.toFixed(1)}
                          </span>
                        </div>
                        <div className="ie-lh-bg-tertiary mt-1 h-1.5 overflow-hidden rounded-full">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${s.pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="ie-lh-text-muted mx-auto mt-5 max-w-5xl px-1 text-center text-xs">
          Illustrative exchange · scores shown are example values, not a guarantee of outcomes.
        </p>
      </div>
    </section>
  );
}
