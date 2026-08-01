/**
 * Scroll showcase — Option 1b depth panels (full-viewport scenes).
 * Lazy-loaded below the fold. Avatar reuses existing optimized hero assets.
 */

export const SCROLL_SHOWCASE_INTRO = {
  badge: 'HOW ONE SESSION WORKS',
  headlineLine1: 'One Mock Interview',
  headlineLine2: 'from resume to Interview Report.',
  body: 'Upload your resume, answer by voice, handle Adaptive Follow-up Questions, and finish with an Interview Report — one uninterrupted session.',
} as const;

export const SCROLL_SHOWCASE_STEPS = [
  {
    id: 'resume',
    num: '01',
    label: '01 — Resume-aware',
    title: 'Your interviewer starts with your resume — your practice should too.',
    body: "Questions come from your projects, stack, and level — not a generic bank. You rehearse the stories a real panel will actually ask about.",
    generatedQuestion:
      '“Walk me through the Kafka pipeline on your resume — why not a managed queue?”',
  },
  {
    id: 'voice',
    num: '02',
    label: '02 — Adaptive Follow-up Questions',
    title: 'Weak or vague answers trigger follow-ups, just like a real interviewer.',
    body: 'Speak out loud. Vague answers get caught. Strong answers get pushed deeper — so you stop freezing when the second question lands.',
    followUp: '“You mentioned caching — how did you handle invalidation?”',
  },
  {
    id: 'report',
    num: '03',
    label: '03 — Interview Report',
    title: 'Your Interview Report lands when the session ends.',
    body: 'Answer Feedback from each response rolls into one Interview Report — strengths, gaps, and what to practice before your next Mock Interview.',
    verdict: 'Almost Ready',
  },
] as const;

export const SCROLL_SHOWCASE_REPORT_DIMS = [
  { label: 'Communication Clarity', w: 74 },
  { label: 'Content Accuracy', w: 76 },
  { label: 'Answer Structure', w: 83 },
  { label: 'Specificity', w: 74 },
  { label: 'Relevance', w: 75 },
] as const;

export const SCROLL_SHOWCASE_REPORT_SCORE = 7.8;

/** Full waveform for desktop; mobile slices to first 8 in the component. */
export const SCROLL_SHOWCASE_EQ_BARS = [
  18, 30, 42, 26, 38, 20, 46, 32, 24, 40, 28, 44, 22, 36, 30, 18,
].map((h, i) => ({
  h,
  dur: (0.7 + (i % 5) * 0.12).toFixed(2),
  d: (-(i * 0.13)).toFixed(2),
}));
