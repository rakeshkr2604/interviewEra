/**
 * Scroll showcase — Option 1b depth panels (full-viewport scenes).
 * Lazy-loaded below the fold. Avatar reuses existing optimized hero assets.
 */

export const SCROLL_SHOWCASE_INTRO = {
  badge: 'THE ENGINE',
  headlineLine1: 'Three reasons',
  headlineLine2: 'it feels real.',
  body: 'Scroll through the interview engine — from your resume to your report.',
} as const;

export const SCROLL_SHOWCASE_STEPS = [
  {
    id: 'resume',
    num: '01',
    label: '01 — RESUME-AWARE',
    title: 'It reads your resume before it asks a thing.',
    body: "Your projects, your stack, your level — the question plan is built from what you've actually shipped. No generic question banks.",
    generatedQuestion:
      '“Walk me through the Kafka pipeline on your resume — why not a managed queue?”',
  },
  {
    id: 'voice',
    num: '02',
    label: '02 — LIVE VOICE',
    title: 'A voice interviewer that actually listens.',
    body: 'Answer out loud, in real time. Vague answers get caught. Good answers get pushed deeper — with follow-ups, like a sharp human interviewer.',
    followUp: '“You mentioned caching — how did you handle invalidation?”',
  },
  {
    id: 'report',
    num: '03',
    label: '03 — SCORED REPORT',
    title: 'Feedback you can act on — not a vibe.',
    body: 'Five scored dimensions, moment-level notes, and a clear verdict. Your next attempt is measurably better.',
    verdict: 'Strong hire signal',
  },
] as const;

export const SCROLL_SHOWCASE_REPORT_DIMS = [
  { label: 'Relevance', w: 100 },
  { label: 'Content Accuracy', w: 70 },
  { label: 'Communication Clarity', w: 70 },
  { label: 'Answer Structure', w: 65 },
  { label: 'Specificity', w: 55 },
] as const;

export const SCROLL_SHOWCASE_REPORT_SCORE = 8.4;

/** Full waveform for desktop; mobile slices to first 8 in the component. */
export const SCROLL_SHOWCASE_EQ_BARS = [
  18, 30, 42, 26, 38, 20, 46, 32, 24, 40, 28, 44, 22, 36, 30, 18,
].map((h, i) => ({
  h,
  dur: (0.7 + (i % 5) * 0.12).toFixed(2),
  d: (-(i * 0.13)).toFixed(2),
}));
