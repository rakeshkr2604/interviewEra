import { Captions, CircleDot } from 'lucide-react';

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

// ── Types ──────────────────────────────────────────────────────────────────────

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

// ── Conversation data ──────────────────────────────────────────────────────────

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

// ── Live transcript ────────────────────────────────────────────────────────────

const CAPTION_WORDS =
  'We cached product catalog responses in Redis with a five minute TTL and invalidated'.split(' ');
const CAPTION_ACTIVE = 11; // "TTL" — the term that triggered the adaptive follow-up

// ── Waveform ──────────────────────────────────────────────────────────────────

const WAVEFORM_HEIGHTS = [5, 9, 6, 11, 4, 8, 5, 10, 7] as const;

// ── Rubric scores ─────────────────────────────────────────────────────────────

const SCORES = [
  { name: 'Structured communication', val: 7.4, pct: 74 },
  { name: 'Technical depth',          val: 8.1, pct: 81 },
  { name: 'Answer structure',         val: 8.6, pct: 86 },
  { name: 'Delivery composure',       val: 6.8, pct: 68 }, // weak → amber highlight card
  { name: 'Response relevance',       val: 8.2, pct: 82 },
] as const;

// ── Component ──────────────────────────────────────────────────────────────────

export function LandingInterviewDemo() {
  return (
    <section className="px-5 py-20 sm:py-24">

      {/* Section heading */}
      <div className="mx-auto max-w-3xl text-center">
        <span
          className="text-[11px] font-bold uppercase tracking-[0.16em]"
          style={{ color: 'var(--accent-hover)' }}
        >
          A live session, not a list
        </span>
        <h2
          className="mt-3.5 text-balance text-3xl font-extrabold tracking-tight sm:text-[42px] sm:leading-[1.08]"
          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
        >
          It reads your answer, then asks the harder question
        </h2>
        <p
          className="mx-auto mt-4 max-w-xl text-base leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          Every question comes from your resume, and every follow-up comes from what you just said.
          This is one real exchange — the kind a static question bank can never run.
        </p>
      </div>

      {/* ── Demo card ──────────────────────────────────────────────────────── */}
      <div
        className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-3xl border-2"
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
        }}
      >

        {/* Session header */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-6"
          style={{
            borderBottom: '1px solid var(--card-border)',
            background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: 'var(--accent-success)' }}
            >
              <CircleDot className="size-3.5" aria-hidden />
              Live
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Backend Engineer · Technical round
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Q 3 / 6
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
              04:12
            </span>
          </div>
        </div>

        {/* Two-column body */}
        <div className="grid gap-0 lg:grid-cols-[1.5fr_1fr]">

          {/* ── Left: conversation ───────────────────────────────────────── */}
          <div
            className="space-y-3.5 p-5 sm:p-7"
            style={{ borderRight: '1px solid var(--card-border)' }}
          >
            {ITEMS.map((item, i) => {

              // ── Signal row — green system event band ────────────────────
              if (item.who === 'signal') {
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-success) 8%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--accent-success) 20%, transparent)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: 'var(--accent-success)' }}
                        aria-hidden
                      />
                      <span
                        className="truncate text-[10px] font-medium"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {item.text}
                      </span>
                    </div>
                    <span
                      className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--accent-success) 35%, transparent)',
                        color: 'var(--accent-success)',
                        background: 'color-mix(in srgb, var(--accent-success) 8%, transparent)',
                      }}
                    >
                      {item.tag}
                    </span>
                  </div>
                );
              }

              // ── Chat turn ────────────────────────────────────────────────
              const isInterviewer = item.who === 'interviewer';
              const isChallenge = !!item.highlight;

              return (
                <div
                  key={i}
                  className={isInterviewer ? 'flex flex-col items-start' : 'flex flex-col items-end'}
                >
                  {/* Label row */}
                  <div
                    className={`mb-1 flex flex-col px-1 ${isInterviewer ? 'items-start' : 'items-end'}`}
                  >
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        // Challenge → amber; normal interviewer → accent-hover; candidate → muted
                        color: isChallenge
                          ? 'var(--accent-warning)'
                          : isInterviewer
                            ? 'var(--accent-hover)'
                            : 'var(--text-muted)',
                      }}
                    >
                      {item.label}
                    </span>
                    {item.sublabel && (
                      <span
                        className="text-[10px] leading-tight"
                        style={{ color: 'var(--accent-warning)', opacity: 0.75 }}
                      >
                        {item.sublabel}
                      </span>
                    )}
                  </div>

                  {/* Bubble */}
                  <p
                    className="max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                    style={
                      isChallenge
                        ? {
                            // Amber/warning tint — communicates pressure
                            background:
                              'color-mix(in srgb, var(--accent-warning) 12%, transparent)',
                            color: 'var(--text-primary)',
                            border:
                              '1px solid color-mix(in srgb, var(--accent-warning) 35%, transparent)',
                            borderTopLeftRadius: 4,
                          }
                        : isInterviewer
                          ? {
                              // Blue tint — neutral question
                              background:
                                'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                              color: 'var(--text-primary)',
                              borderTopLeftRadius: 4,
                            }
                          : {
                              // Candidate — neutral surface
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-secondary)',
                              borderTopRightRadius: 4,
                            }
                    }
                  >
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ── Right: analysis rail ─────────────────────────────────────── */}
          <div className="flex flex-col gap-5 p-5 sm:p-7">

            {/* Live transcript */}
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Captions className="size-3.5" aria-hidden />
                  Live transcript
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[10px] font-semibold"
                    style={{ color: 'var(--accent-success)' }}
                  >
                    ● Speaking
                  </span>
                  <div className="flex items-end gap-px" aria-hidden>
                    {WAVEFORM_HEIGHTS.map((h, i) => (
                      <div
                        key={i}
                        className="w-px rounded-full"
                        style={{
                          height: h,
                          background: 'var(--accent-success)',
                          opacity: 0.35 + (i % 3) * 0.12,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Word-by-word transcript */}
              <p
                className="rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'var(--bg-tertiary)',
                  borderLeft: '2px solid color-mix(in srgb, var(--accent-success) 50%, transparent)',
                }}
              >
                {CAPTION_WORDS.map((w, i) => (
                  <span
                    key={i}
                    style={{
                      color:
                        i < CAPTION_ACTIVE
                          ? 'var(--text-primary)'
                          : i === CAPTION_ACTIVE
                            ? 'var(--accent-primary)'
                            : 'var(--text-muted)',
                      fontWeight: i === CAPTION_ACTIVE ? 700 : 400,
                    }}
                  >
                    {w}{' '}
                  </span>
                ))}
              </p>
            </div>

            {/* Response analysis */}
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Response analysis
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center gap-1 text-[10px] font-medium"
                    style={{ color: 'var(--accent-success)' }}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: 'var(--accent-success)' }}
                      aria-hidden
                    />
                    Updating
                  </span>
                  <span
                    className="font-mono text-sm font-bold"
                    style={{ color: 'var(--accent-success)' }}
                  >
                    7.8 / 10
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {SCORES.map((s) => {
                  const isWeak = s.val < 7;
                  const color = isWeak ? 'var(--accent-warning)' : 'var(--accent-success)';

                  return (
                    <div
                      key={s.name}
                      className={isWeak ? 'rounded-lg px-2.5 py-2 -mx-2.5' : ''}
                      style={
                        isWeak
                          ? {
                              background:
                                'color-mix(in srgb, var(--accent-warning) 8%, transparent)',
                              border:
                                '1px solid color-mix(in srgb, var(--accent-warning) 25%, transparent)',
                            }
                          : undefined
                      }
                    >
                      <div
                        className="flex items-center justify-between text-xs"
                        style={{ color: isWeak ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                      >
                        <span className={isWeak ? 'font-medium' : ''}>{s.name}</span>
                        <span className="font-mono font-semibold" style={{ color }}>
                          {s.val.toFixed(1)}
                        </span>
                      </div>
                      <div
                        className="mt-1 h-1.5 overflow-hidden rounded-full"
                        style={{ background: 'var(--bg-tertiary)' }}
                      >
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

      <p
        className="mx-auto mt-4 max-w-5xl px-1 text-center text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        Illustrative exchange · scores shown are example values, not a guarantee of outcomes.
      </p>
    </section>
  );
}
