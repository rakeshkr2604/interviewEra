/**
 * Scroll showcase — Option 1b depth panels (full-viewport scenes).
 * Lazy-loaded below the fold. Avatar reuses existing optimized hero assets.
 */

export const SCROLL_SHOWCASE_INTRO = {
  badge: 'THE ENGINE',
  headlineLine1: 'Three reasons',
  headlineLine2: 'practice sticks.',
  body: 'From your resume to a scored report — the loop that turns guessing into placement-ready answers.',
} as const;

export const SCROLL_SHOWCASE_STEPS = [
  {
    id: 'resume',
    num: '01',
    label: '01 — RESUME-AWARE',
    title: 'Your interviewer starts with your resume — your practice should too.',
    body: "Questions come from your projects, stack, and level — not a generic bank. You rehearse the stories a real panel will actually ask about.",
    generatedQuestion:
      '“Walk me through the Kafka pipeline on your resume — why not a managed queue?”',
  },
  {
    id: 'voice',
    num: '02',
    label: '02 — LIVE VOICE',
    title: 'Weak or vague answers trigger follow-ups, just like a real interviewer.',
    body: 'Speak out loud. Vague answers get caught. Strong answers get pushed deeper — so you stop freezing when the second question lands.',
    followUp: '“You mentioned caching — how did you handle invalidation?”',
  },
  {
    id: 'report',
    num: '03',
    label: '03 — SCORED REPORT',
    title: 'Know exactly why an answer scored well — and what to improve next.',
    body: 'Five scored dimensions, moment-level notes, and a clear verdict. Walk into the next interview knowing what to tighten.',
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
