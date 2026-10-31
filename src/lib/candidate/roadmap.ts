import type { DimensionScores } from '@/types/app.types';
import { REPORT_DIMENSION_LABELS } from '@/lib/utils/report-radar-dimensions';
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path';
import type { CandidateSnapshot, PersonalizedRoadmap } from './types';
import { weakestDimensions } from './readiness-score';

const DIMENSION_TOPIC_COPY: Record<
  keyof DimensionScores,
  { title: string; description: string; keyActions: string[]; commonMistakes: string[]; quickWin: string }
> = {
  communication_clarity: {
    title: 'Structured communication',
    description: 'Practice concise openings, evidence, and conclusions for each answer.',
    keyActions: [
      'Open with a one-line summary before adding detail.',
      'Use simple language first, then layer in technical terms if asked.',
      'Close every answer with a short takeaway instead of trailing off.',
    ],
    commonMistakes: [
      'Jumping straight into details without framing the answer first.',
      'Using jargon the interviewer has to stop and ask about.',
    ],
    quickWin: 'Record a 60-second answer and check if a non-expert friend could follow it.',
  },
  technical_depth: {
    title: 'Technical fundamentals',
    description: 'Deepen core CS topics and role-specific stack knowledge with timed drills.',
    keyActions: [
      'Review core data structures, complexity trade-offs, and system design basics.',
      'Re-derive one fundamental concept from scratch each day instead of just reading about it.',
      'Practice explaining the "why" behind a design choice, not just the "what".',
    ],
    commonMistakes: [
      'Memorizing solutions without understanding the underlying trade-offs.',
      'Skipping edge cases and complexity analysis when explaining an approach.',
    ],
    quickWin: 'Pick one topic from your weakest area and solve two timed problems on it today.',
  },
  answer_structure: {
    title: 'STAR answer framing',
    description: 'Use Situation → Task → Action → Result for behavioral and project answers.',
    keyActions: [
      'Set up the Situation and Task in one or two sentences — don’t over-explain context.',
      'Spend most of your answer on the Action you personally took.',
      'Always close with a measurable Result, even an approximate one.',
    ],
    commonMistakes: [
      'Spending too long on background and running out of time for the Result.',
      'Describing what "the team" did instead of your own specific contribution.',
    ],
    quickWin: 'Rewrite one recent answer using Situation/Task/Action/Result as explicit labels.',
  },
  confidence: {
    title: 'Confident delivery',
    description: 'Reduce filler words and hedge phrases; rehearse aloud before mocks.',
    keyActions: [
      'Replace hedges like "I think maybe" with direct statements.',
      'Pause instead of filling silence with "um" or "like".',
      'Rehearse your top 3 stories out loud until they feel natural, not memorized.',
    ],
    commonMistakes: [
      'Downplaying real achievements with excessive qualifiers.',
      'Rushing through answers to "get it over with" instead of pacing deliberately.',
    ],
    quickWin: 'Say your strongest achievement out loud, once with hedges and once without — notice the difference.',
  },
  relevance: {
    title: 'Question relevance',
    description: 'Listen for the ask, restate it, and anchor each answer to the prompt.',
    keyActions: [
      'Restate the question in your own words before answering, especially for ambiguous prompts.',
      'Check your answer against the question before moving on — did you actually answer it?',
      'Tie examples back to the specific role or scenario asked about.',
    ],
    commonMistakes: [
      'Giving a generic, rehearsed answer that doesn’t address what was actually asked.',
      'Drifting into an unrelated story partway through the answer.',
    ],
    quickWin: 'Before your next mock, practice restating 3 sample questions in your own words first.',
  },
};

const DIMENSION_QUESTIONS: Record<
  keyof DimensionScores,
  { question: string; category: 'technical' | 'behavioral' | 'situational'; difficulty: 'easy' | 'medium' | 'hard'; probing: string }[]
> = {
  communication_clarity: [
    {
      question: 'Explain a technical concept you know well to a non-technical stakeholder.',
      category: 'behavioral',
      difficulty: 'medium',
      probing: 'Evaluates your ability to simplify jargon without losing accuracy.',
    },
    {
      question: 'Walk me through a project decision and how you communicated trade-offs.',
      category: 'behavioral',
      difficulty: 'medium',
      probing: 'Checks whether you can make technical trade-offs understandable to stakeholders.',
    },
  ],
  technical_depth: [
    {
      question: 'How would you design a rate limiter for an API?',
      category: 'technical',
      difficulty: 'hard',
      probing: 'Evaluates system design reasoning and trade-offs between common rate-limiting algorithms.',
    },
    {
      question: 'Compare time complexity of common sorting algorithms and when you would use each.',
      category: 'technical',
      difficulty: 'easy',
      probing: 'Evaluates understanding of basic data structures and their appropriate use cases.',
    },
  ],
  answer_structure: [
    {
      question: 'Tell me about a time you handled a tight deadline.',
      category: 'behavioral',
      difficulty: 'easy',
      probing: 'Checks whether you can frame a situation, action, and result clearly under time pressure.',
    },
    {
      question: 'Describe a conflict with a teammate and how you resolved it.',
      category: 'behavioral',
      difficulty: 'medium',
      probing: 'Evaluates conflict-resolution skills and whether your answer follows a clear narrative arc.',
    },
  ],
  confidence: [
    {
      question: 'Why should we hire you for this role?',
      category: 'behavioral',
      difficulty: 'easy',
      probing: 'Checks self-awareness and whether you can state your value concisely without hedging.',
    },
    {
      question: 'What is your biggest professional achievement so far?',
      category: 'behavioral',
      difficulty: 'medium',
      probing: 'Evaluates how confidently and specifically you can own your impact.',
    },
  ],
  relevance: [
    {
      question: 'How does your recent project experience map to this role?',
      category: 'situational',
      difficulty: 'medium',
      probing: 'Checks whether you can connect your background directly to the role requirements.',
    },
    {
      question: 'What would you do in your first 30 days if you joined tomorrow?',
      category: 'situational',
      difficulty: 'medium',
      probing: 'Evaluates whether your answer stays anchored to the specific role and team context.',
    },
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
      guide: {
        whatToExpect: [
          `Questions targeted at ${focusLabel.toLowerCase()}, the area you're currently weakest in.`,
          `${difficulty === 'hard' ? 'Fast-paced, in-depth' : difficulty === 'medium' ? 'Moderate-depth' : 'Foundational'} follow-ups matched to your current tier.`,
          'At least one probe that pushes past your first answer to test depth.',
        ],
        howToPrepare: [
          `Re-read your last report's ${focusLabel} feedback right before starting.`,
          'Have 1-2 concrete examples ready that showcase this specific skill.',
          'Time yourself — aim for focused 60-90 second answers, not rambling ones.',
        ],
      },
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
      guide: {
        whatToExpect: [
          'Deep dives into 2-3 projects pulled directly from your resume.',
          'Questions on specific technical decisions and trade-offs you made.',
          'At least one "what would you do differently" follow-up per project.',
        ],
        howToPrepare: [
          snapshot.latestResume
            ? 'Re-read your resume and recall specific numbers or metrics for each project.'
            : 'Upload your resume first so this session can probe your actual projects.',
          'Prepare a 60-second summary for each major project you expect to be asked about.',
          'Think through one trade-off or mistake per project and how you’d handle it differently now.',
        ],
      },
    },
    {
      id: 'mock-behavioral',
      title: 'HR / behavioral round',
      description: 'STAR-format answers for campus and early-career screens.',
      href: qs({ role, mode: 'hr_behavioral', difficulty: 'easy' }),
      difficulty: 'easy',
      reason: 'Balances technical gaps with placement-ready soft skills',
      guide: {
        whatToExpect: [
          'STAR-format behavioral questions at an easy, campus-interview pace.',
          'Prompts on teamwork, conflict, ownership, and failure.',
          'Minimal technical content — the focus is communication and structure.',
        ],
        howToPrepare: [
          'Prepare 3-4 STAR stories covering conflict, failure, leadership, and a key achievement.',
          'Practice keeping each story under 90 seconds.',
          'Use specific numbers and outcomes instead of vague descriptions.',
        ],
      },
    },
  ];
}

export function generatePersonalizedRoadmap(snapshot: CandidateSnapshot): PersonalizedRoadmap {
  const weakDims = weakestDimensions(snapshot.dimensionAverages, 3);
  const targetRole = snapshot.targetRole || snapshot.profile.preferredRole || 'Software Engineer';

  const recommendedTopics = weakDims.map((dim, idx) => {
    const copy = DIMENSION_TOPIC_COPY[dim];
    return {
      id: `topic-${dim}`,
      title: copy.title,
      description: copy.description,
      dimension: dim,
      priority: (idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low') as 'high' | 'medium' | 'low',
      currentScore: snapshot.dimensionAverages[dim],
      guide: {
        keyActions: copy.keyActions,
        commonMistakes: copy.commonMistakes,
        quickWin: copy.quickWin,
      },
    };
  });

  const suggestedQuestions = weakDims.flatMap((dim) =>
    DIMENSION_QUESTIONS[dim].map((q, idx) => ({
      id: `q-${dim}-${idx}`,
      question: q.question,
      category: q.category,
      difficulty: q.difficulty,
      probing: q.probing,
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
