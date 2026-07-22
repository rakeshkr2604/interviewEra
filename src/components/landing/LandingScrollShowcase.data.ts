/**
 * Scroll showcase — pinned visual stage + scrolling feature callouts (Option 1a).
 * Lazy-loaded below the fold. Avatar reuses existing optimized hero assets.
 */
export const SCROLL_SHOWCASE_STEPS = [
  {
    id: 'resume',
    num: '01',
    title: 'It reads your resume before it asks a thing.',
    body: 'Upload your resume and InterviewEra builds the interview around it — your projects, your stack, your experience level. No generic question banks.',
    chips: ['Parses projects & skills', 'Calibrated to your level'],
  },
  {
    id: 'voice',
    num: '02',
    title: 'A voice interviewer that actually listens.',
    body: 'Answer out loud, in real time. The AI hears your answer, catches the vague parts, and pushes deeper with follow-ups — like a sharp human interviewer would.',
    chips: ['Real-time speech', 'Adaptive follow-ups'],
  },
  {
    id: 'report',
    num: '03',
    title: 'Feedback you can act on — not a vibe.',
    body: 'Every session ends with a scored report across five dimensions, plus the exact moments to improve. Your next attempt is measurably better.',
    chips: ['5 scored dimensions', 'Moment-level notes'],
  },
] as const;

export const SCROLL_SHOWCASE_REPORT_DIMS = [
  { label: 'Communication clarity', w: 74 },
  { label: 'Technical depth', w: 64 },
  { label: 'STAR structure', w: 84 },
  { label: 'Confidence', w: 65 },
  { label: 'Relevance', w: 76 },
] as const;

export const SCROLL_SHOWCASE_REPORT_SCORE = 8.4;
