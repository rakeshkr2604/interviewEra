import type { DimensionScores } from '@/types/app.types';
import { REPORT_DIMENSION_LABELS } from '@/lib/utils/report-radar-dimensions';
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path';
import type { CandidateSnapshot, PersonalizedRoadmap } from './types';
import { weakestDimensions } from './readiness-score';

const DIMENSION_TOPIC_COPY: Record<keyof DimensionScores, { title: string; description: string }> = {
  communication_clarity: {
    title: 'Structured communication',
    description: 'Practice concise openings, evidence, and conclusions for each answer.',
  },
  technical_depth: {
    title: 'Technical fundamentals',
    description: 'Deepen core CS topics and role-specific stack knowledge with timed drills.',
  },
  answer_structure: {
    title: 'STAR answer framing',
    description: 'Use Situation → Task → Action → Result for behavioral and project answers.',
  },
  confidence: {
    title: 'Confident delivery',
    description: 'Reduce filler words and hedge phrases; rehearse aloud before mocks.',
  },
  relevance: {
    title: 'Question relevance',
    description: 'Listen for the ask, restate it, and anchor each answer to the prompt.',
  },
};

const DIMENSION_QUESTIONS: Record<keyof DimensionScores, { question: string; category: 'technical' | 'behavioral' | 'situational' }[]> = {
  communication_clarity: [
    { question: 'Explain a technical concept you know well to a non-technical stakeholder.', category: 'behavioral' },
    { question: 'Walk me through a project decision and how you communicated trade-offs.', category: 'behavioral' },
  ],
  technical_depth: [
    { question: 'How would you design a rate limiter for an API?', category: 'technical' },
    { question: 'Compare time complexity of common sorting algorithms and when you would use each.', category: 'technical' },
  ],
  answer_structure: [
    { question: 'Tell me about a time you handled a tight deadline.', category: 'behavioral' },
    { question: 'Describe a conflict with a teammate and how you resolved it.', category: 'behavioral' },
  ],
  confidence: [
    { question: 'Why should we hire you for this role?', category: 'behavioral' },
    { question: 'What is your biggest professional achievement so far?', category: 'behavioral' },
  ],
  relevance: [
    { question: 'How does your recent project experience map to this role?', category: 'situational' },
    { question: 'What would you do in your first 30 days if you joined tomorrow?', category: 'situational' },
  ],
};

function interviewRecommendations(
  snapshot: CandidateSnapshot,
  weakDims: (keyof DimensionScores)[],
): PersonalizedRoadmap['recommendedInterviews'] {
  const role = snapshot.targetRole || 'Software Engineer';
  const tier = snapshot.progress?.current_tier ?? 1;
  const primaryWeak = weakDims[0] ?? 'technical_depth';

  const difficulty: 'easy' | 'medium' | 'hard' =
    tier >= 3 ? 'hard' : tier >= 2 ? 'medium' : 'easy';

  const focusLabel = REPORT_DIMENSION_LABELS[primaryWeak];

  const start = getDefaultInterviewStartPath();
  const qs = (params: Record<string, string>) => {
    const sp = new URLSearchParams(params);
    return `${start}?${sp.toString()}`;
  };

  return [
    {
      id: 'mock-weak-dimension',
      title: `${role} mock — ${focusLabel} focus`,
      description: `Targeted session emphasizing ${focusLabel.toLowerCase()}.`,
      href: qs({
        role,
        focus: primaryWeak,
        difficulty,
        mode: primaryWeak === 'technical_depth' ? 'technical' : 'mixed',
      }),
      difficulty,
      reason: `Lowest dimension: ${focusLabel}`,
    },
    {
      id: 'mock-resume',
      title: 'Resume-deep-dive mock',
      description: 'Probe projects and skills from your uploaded resume.',
      href: qs({
        role,
        difficulty: tier >= 2 ? 'medium' : 'easy',
        mode: 'mixed',
        focus: 'resume',
      }),
      difficulty: tier >= 2 ? 'medium' : 'easy',
      reason: snapshot.latestResume ? 'Resume on file' : 'Upload resume first',
    },
    {
      id: 'mock-behavioral',
      title: 'HR / behavioral round',
      description: 'STAR-format answers for campus and early-career screens.',
      href: qs({ role, mode: 'hr_behavioral', difficulty: 'easy' }),
      difficulty: 'easy',
      reason: 'Balances technical gaps with placement-ready soft skills',
    },
  ];
}

export function generatePersonalizedRoadmap(snapshot: CandidateSnapshot): PersonalizedRoadmap {
  const weakDims = weakestDimensions(snapshot.dimensionAverages, 3);
  const targetRole = snapshot.targetRole || snapshot.profile.preferredRole || 'Software Engineer';

  const recommendedTopics = weakDims.map((dim, idx) => ({
    id: `topic-${dim}`,
    title: DIMENSION_TOPIC_COPY[dim].title,
    description: DIMENSION_TOPIC_COPY[dim].description,
    dimension: dim,
    priority: (idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
  }));

  const suggestedQuestions = weakDims.flatMap((dim) =>
    DIMENSION_QUESTIONS[dim].map((q, idx) => ({
      id: `q-${dim}-${idx}`,
      question: q.question,
      category: q.category,
      dimension: dim,
    })),
  ).slice(0, 6);

  const suggestedTools: PersonalizedRoadmap['suggestedTools'] = [
    {
      id: 'tool-ats',
      title: 'ATS resume checker',
      description: 'Validate resume formatting before campus drives.',
      href: '/tools/ats-checker',
    },
    {
      id: 'tool-star',
      title: 'STAR answer builder',
      description: 'Structure behavioral answers with guided prompts.',
      href: '/tools/star-builder',
    },
    {
      id: 'tool-questions',
      title: 'Question generator',
      description: 'Role-specific practice prompts for quick drills.',
      href: '/tools/question-generator',
    },
  ];

  if (weakDims.includes('technical_depth')) {
    suggestedTools.push({
      id: 'tool-dsa',
      title: 'DSA practice hub',
      description: 'Top patterns and problems for engineering interviews.',
      href: '/blog/top-dsa-interview-questions',
    });
  }

  return {
    targetRole,
    weakDimensions: weakDims,
    recommendedInterviews: interviewRecommendations(snapshot, weakDims),
    recommendedTopics,
    suggestedQuestions,
    suggestedTools,
    generatedAt: new Date().toISOString(),
  };
}
