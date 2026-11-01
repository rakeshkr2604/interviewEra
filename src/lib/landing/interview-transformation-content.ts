import type { LucideIcon } from 'lucide-react';
import {
  AudioLines,
  BarChart3,
  FileSearch,
  MessageCircle,
  MessageSquarePlus,
  Target,
} from 'lucide-react';

export const INTERVIEW_TRANSFORMATION_INTRO = {
  eyebrow: 'BENEFITS',
  headlineLead: 'More than practice.',
  headlineAccent: 'A clearer path',
  headlineTail: 'to improvement.',
  supportingCopy:
    'Every session shows how your answers land — so the next one is better for a specific reason, not by chance.',
} as const;

export type InterviewTransformationJourneyTone = 'neutral' | 'primary' | 'success';

export const INTERVIEW_TRANSFORMATION_JOURNEY = [
  {
    id: 'generate',
    label: 'Prepare Answers',
    step: '01',
    tone: 'neutral' as const,
    icon: MessageSquarePlus,
  },
  {
    id: 'practice',
    label: 'Practice Delivery',
    step: '02',
    tone: 'primary' as const,
    icon: AudioLines,
  },
  {
    id: 'improve',
    label: 'Improve & Repeat',
    step: '03',
    tone: 'success' as const,
    icon: Target,
  },
] as const;

export type InterviewTransformationTone = 'primary' | 'accent' | 'success';

export type InterviewTransformationCapability = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tone: InterviewTransformationTone;
};

export const INTERVIEW_TRANSFORMATION_CAPABILITIES: readonly InterviewTransformationCapability[] = [
  {
    id: 'strengths',
    title: 'Understand your strengths and weaknesses',
    description:
      'Five scored dimensions on every answer show what already works and what needs attention.',
    icon: BarChart3,
    tone: 'primary',
  },
  {
    id: 'projects',
    title: 'Explain your projects with more clarity',
    description: 'Resume-aware questions make you practise the projects you will actually be asked about.',
    icon: FileSearch,
    tone: 'accent',
  },
  {
    id: 'follow-ups',
    title: 'Handle follow-ups more confidently',
    description: 'Adaptive follow-up questions rehearse the technical and behavioural depth interviewers probe.',
    icon: MessageCircle,
    tone: 'primary',
  },
  {
    id: 'progress',
    title: 'Track improvement across sessions',
    description: 'Interview reports and progress history show whether your weak dimensions are improving.',
    icon: Target,
    tone: 'success',
  },
] as const;

/** Illustrative before/after answer — sample copy, never a real candidate's response. */
export const INTERVIEW_TRANSFORMATION_RIBBON = {
  question: 'Tell me about a time you solved a hard technical problem under a deadline.',
  disclosure: 'Illustrative sample answers',
  before: {
    title: 'Unstructured answer',
    answer:
      'Yeah so basically in my project we had some issues and I worked with my team. We used different things and I did my best. It was tough but we managed to finish it.',
    issues: ['No clear situation', 'Your contribution is vague', 'No outcome'] as const,
  },
  after: {
    title: 'Structured STAR answer',
    parts: [
      {
        key: 'S',
        label: 'Situation',
        text: 'Two days before our final-year demo, the payment API started failing intermittently.',
      },
      { key: 'T', label: 'Task', text: 'I owned backend debugging without breaking the checkout flow.' },
      {
        key: 'A',
        label: 'Action',
        text: 'I reproduced it with logging, traced a race in the retry worker and added idempotency keys with backoff.',
      },
      { key: 'R', label: 'Result', text: 'The demo ran on time with zero failed payments.' },
    ] as const,
  },
} as const;

export const INTERVIEW_TRANSFORMATION_TRUST = {
  lead: 'Real interviews reward performance—not preparation alone.',
  emphasisLead: 'Practice',
  emphasisAccent: 'the interview',
  emphasisTail: ', not just the answers.',
} as const;

export const INTERVIEW_TRANSFORMATION_CTA = {
  label: 'Start Your Mock Interview',
  footnote: 'Free account · no card required',
  section: 'interview_transformation',
} as const;
