import type { ProductPreviewConversationTurn } from '@/components/product-preview/ConversationTurn';

/** Illustrative resume row — matches upload panel file presentation. */
export const RESUME_PREVIEW_FILE = {
  name: 'Resume.pdf',
  meta: '2.4 MB · PDF',
  message: "I've analyzed your resume. Questions will be personalized to your experience.",
} as const;

export const RESUME_PREVIEW_PIPELINE = ['Uploaded', 'Analyzed', 'Personalized'] as const;

export const FOLLOW_UP_PREVIEW_TURNS: ProductPreviewConversationTurn[] = [
  {
    who: 'interviewer',
    label: 'Meera',
    text: 'Why did you choose Next.js instead of React?',
  },
  {
    who: 'candidate',
    label: 'You',
    text: 'Because Next.js gives us SSR and routing out of the box for our campus project.',
  },
  {
    who: 'interviewer',
    label: 'Adaptive Follow-up Questions',
    sublabel: '↳ Challenge · SSR performance',
    text: 'Can you explain why SSR improves performance in this case?',
    highlight: true,
  },
];

export const FEEDBACK_PREVIEW_SCORE = {
  overall: 7.8,
  label: 'Good',
} as const;

export const FEEDBACK_PREVIEW_DIMENSIONS = [
  { name: 'Communication Clarity', val: 7.4, pct: 74 },
  { name: 'Content Accuracy', val: 7.6, pct: 76 },
  { name: 'Answer Structure', val: 8.3, pct: 83 },
  { name: 'Specificity', val: 7.4, pct: 74 },
  { name: 'Relevance', val: 7.5, pct: 75 },
] as const;

export const FEEDBACK_PREVIEW_INSIGHT = {
  dimension: 'Communication Clarity',
  score: 7.4,
  tip: 'Slow down while explaining project architecture.',
} as const;

export const WORKFLOW_BENEFITS = [
  { id: 'resume-aware', label: 'Resume-aware', icon: 'file' as const },
  { id: 'voice', label: 'Voice Interview', icon: 'mic' as const },
  { id: 'follow-ups', label: 'Adaptive Follow-up Questions', icon: 'messages' as const },
  { id: 'scoring', label: 'Answer Feedback', icon: 'chart' as const },
  { id: 'actionable', label: 'Interview Report', icon: 'insight' as const },
] as const;
