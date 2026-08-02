import type { LucideIcon } from 'lucide-react';
import {
  AudioLines,
  BarChart3,
  FileSearch,
  MessageCircle,
  MessageSquarePlus,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';

export const INTERVIEW_TRANSFORMATION_INTRO = {
  eyebrow: 'NOT ANOTHER AI CHAT',
  headlineLead: 'Practice interviews.',
  headlineAccent: 'Not just',
  headlineTail: 'interview answers.',
  supportingCopy:
    'ChatGPT can help you write better responses. InterviewEra helps you deliver them under real interview pressure—with resume-aware questions, adaptive follow-up questions, structured scoring, and actionable feedback.',
} as const;

export type InterviewTransformationJourneyTone = 'neutral' | 'primary' | 'success';

export const INTERVIEW_TRANSFORMATION_JOURNEY = [
  {
    id: 'generate',
    label: 'Generate Answers',
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
    label: 'Improve Performance',
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
    id: 'resume-aware',
    title: 'Resume-Aware Interviews',
    description: 'Questions begin with your experience—not generic prompts.',
    icon: FileSearch,
    tone: 'primary',
  },
  {
    id: 'pressure',
    title: 'Real Interview Pressure',
    description: 'Adaptive follow-up questions test how well you actually think.',
    icon: MessageCircle,
    tone: 'accent',
  },
  {
    id: 'feedback',
    title: 'Know What To Fix',
    description:
      'Every mock interview ends with structured scoring and a report that shows exactly where to improve.',
    icon: BarChart3,
    tone: 'success',
  },
] as const;

export const INTERVIEW_TRANSFORMATION_RIBBON = {
  before: {
    title: 'Before Practice',
    items: ['Memorized answers', 'Guessing progress', 'Follow-ups feel difficult'] as const,
  },
  after: {
    title: 'After Structured Mock Interviews',
    items: [
      'Repeatable answer structure',
      'Clear improvement areas',
      'Confidence under pressure',
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
  footnote: 'No credit card required',
  section: 'interview_transformation',
} as const;

export const INTERVIEW_TRANSFORMATION_FOOTNOTES = [
  {
    id: 'resume-ai',
    title: 'Resume-aware AI',
    description: 'Tailored to your experience',
    icon: FileSearch,
    tone: 'primary' as const,
  },
  {
    id: 'simulation',
    title: 'Real interview simulation',
    description: 'Adaptive & pressure-tested',
    icon: Sparkles,
    tone: 'accent' as const,
  },
  {
    id: 'scoring',
    title: 'AI Scoring & Feedback',
    description: 'Detailed and actionable',
    icon: ShieldCheck,
    tone: 'primary' as const,
  },
  {
    id: 'reports',
    title: 'Interview reports',
    description: 'Track and improve faster',
    icon: BarChart3,
    tone: 'success' as const,
  },
] as const;
