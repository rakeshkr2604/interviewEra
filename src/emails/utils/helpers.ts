export interface PerformanceMessage {
  title: string;
  description: string;
}

export function generatePerformanceMessage(score: number): PerformanceMessage {
  if (score >= 95) {
    return {
      title: 'Outstanding performance.',
      description: "You're interview-ready for most companies.",
    };
  }
  if (score >= 90) {
    return {
      title: 'Excellent work.',
      description: 'Minor improvements can make you highly competitive.',
    };
  }
  if (score >= 80) {
    return {
      title: 'Solid performance.',
      description: "You're progressing well and are close to interview-ready.",
    };
  }
  if (score >= 70) {
    return {
      title: 'Good foundation.',
      description: 'Focus on technical depth and structured answers.',
    };
  }
  if (score >= 60) {
    return {
      title: "You're moving in the right direction.",
      description: 'A few more mock interviews will significantly improve your confidence.',
    };
  }
  if (score >= 40) {
    return {
      title: 'You have potential.',
      description: 'Work on communication and answer structure before real interviews.',
    };
  }
  return {
    title: "You're at the beginning of your preparation journey.",
    description: "Practice consistently and you'll improve quickly.",
  };
}

export interface ScoreAccent {
  border: string;
  backgroundColor: string;
  text: string;
  className: string;
}

export function generateScoreAccent(score: number): ScoreAccent {
  if (score >= 95) {
    return {
      border: '1px solid #10b981',
      backgroundColor: '#f0fdf4',
      text: '#10b981',
      className: 'score-accent-elite',
    };
  }
  if (score >= 80) {
    return {
      border: '1px solid #ddd6fe',
      backgroundColor: '#f5f3ff',
      text: '#7c3aed',
      className: 'score-accent-good',
    };
  }
  if (score >= 60) {
    return {
      border: '1px solid #fde68a',
      backgroundColor: '#fffbeb',
      text: '#d97706',
      className: 'score-accent-average',
    };
  }
  return {
    border: '1px solid #fecaca',
    backgroundColor: '#fef2f2',
    text: '#dc2626',
    className: 'score-accent-low',
  };
}

export interface InputRoadmapItem {
  title: string;
  status: 'completed' | 'current' | 'pending';
}

export interface ResolvedRoadmapItem {
  label: string;
  completed: boolean;
  active: boolean;
  icon: string;
}

export function generateRoadmap(items: InputRoadmapItem[]): ResolvedRoadmapItem[] {
  return items.map((item) => {
    let icon = '⚪';
    let completed = false;
    let active = false;

    if (item.status === 'completed') {
      icon = '🟢';
      completed = true;
    } else if (item.status === 'current') {
      icon = '🟣';
      active = true;
    }

    return {
      label: item.title,
      completed,
      active,
      icon,
    };
  });
}

export interface SummaryInput {
  strengths: string[];
  weaknesses: string[];
  recommendation?: {
    title: string;
    description: string;
  };
}

export interface ResolvedSummary {
  strengths: string[];
  improvements: string[];
  recommendation: string;
}

export function generateSummary(data: Partial<SummaryInput>): ResolvedSummary {
  return {
    strengths: data.strengths || [],
    improvements: data.weaknesses || [],
    recommendation: data.recommendation
      ? `${data.recommendation.title}: ${data.recommendation.description}`
      : 'Practice targeted mock interview questions to gain familiarity.',
  };
}

// Iteration 4 Growth Engine Helpers
const categoryNames: Record<string, string> = {
  communication: 'Communication',
  technical: 'Technical Depth',
  confidence: 'Confidence',
  problemSolving: 'Problem Solving',
  structure: 'Answer Structure',
};

export interface ScoreInsightItem {
  key: string;
  name: string;
  score: number;
}

export function calculateScoreInsights(scores: Record<string, number>) {
  const keys = Object.keys(scores);
  let strongestKey = keys[0] || 'communication';
  let weakestKey = keys[0] || 'technical';

  keys.forEach((key) => {
    if (scores[key] > scores[strongestKey]) {
      strongestKey = key;
    }
    if (scores[key] < scores[weakestKey]) {
      weakestKey = key;
    }
  });

  return {
    strongest: {
      key: strongestKey,
      name: categoryNames[strongestKey] || strongestKey,
      score: scores[strongestKey] ?? 0,
    },
    weakest: {
      key: weakestKey,
      name: categoryNames[weakestKey] || weakestKey,
      score: scores[weakestKey] ?? 0,
    },
  };
}

export function generateAchievementBadge(scores: Record<string, number>): string {
  const { strongest } = calculateScoreInsights(scores);
  const badges: Record<string, string> = {
    communication: 'Excellent Communicator',
    problemSolving: 'Problem Solver',
    confidence: 'Confident Speaker',
    structure: 'Consistent Performer',
    technical: 'Fast Learner',
  };
  return badges[strongest.key] || 'Consistent Performer';
}

export interface ReadinessDetails {
  label: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
}

export function calculateHiringReadiness(overallScore: number): ReadinessDetails {
  if (overallScore >= 90) {
    return {
      label: 'Interview Ready',
      backgroundColor: '#f0fdf4',
      textColor: '#16a34a',
      borderColor: '#bbf7d0',
    };
  }
  if (overallScore >= 80) {
    return {
      label: 'Almost Ready',
      backgroundColor: '#f5f3ff',
      textColor: '#7c3aed',
      borderColor: '#ddd6fe',
    };
  }
  if (overallScore >= 60) {
    return {
      label: 'Needs Practice',
      backgroundColor: '#fffbeb',
      textColor: '#d97706',
      borderColor: '#fde68a',
    };
  }
  return {
    label: 'Beginner',
    backgroundColor: '#fef2f2',
    textColor: '#dc2626',
    borderColor: '#fecaca',
  };
}

export function calculateHiringProbability(overallScore: number): number {
  return Math.max(0, Math.min(100, Math.round(overallScore * 0.95)));
}

export interface RecommendedInterviewDetails {
  role: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  url: string;
}

export function selectRecommendedInterview(
  scores: Record<string, number>,
  stats: { role: string; company?: string }
): RecommendedInterviewDetails {
  const { weakest } = calculateScoreInsights(scores);
  const roleName = stats.role || 'Frontend Engineer';
  const isFrontend = roleName.toLowerCase().includes('frontend');
  const isBackend = roleName.toLowerCase().includes('backend');

  let role = 'System Design Mock';
  let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate';
  let estimatedMinutes = 20;

  if (weakest.key === 'technical') {
    if (isFrontend) {
      role = 'React Frontend Interview';
      estimatedMinutes = 15;
    } else if (isBackend) {
      role = 'Backend SQL Interview';
      estimatedMinutes = 20;
    } else {
      role = 'Technical Mock Interview';
      estimatedMinutes = 20;
    }
  } else if (weakest.key === 'communication') {
    role = 'Communication Practice';
    estimatedMinutes = 15;
    difficulty = 'Beginner';
  } else if (weakest.key === 'confidence') {
    role = 'HR Behaviour Interview';
    estimatedMinutes = 15;
    difficulty = 'Intermediate';
  } else if (weakest.key === 'problemSolving') {
    role = 'DSA Practice';
    estimatedMinutes = 20;
    difficulty = 'Advanced';
  } else if (weakest.key === 'structure') {
    role = 'STAR Behavioural Interview';
    estimatedMinutes = 15;
    difficulty = 'Intermediate';
  }

  return {
    role,
    difficulty,
    estimatedMinutes,
    url: `https://interviewera.com/practice/${role.toLowerCase().replace(/\s+/g, '-')}`,
  };
}

export function generateCoachingNote(scores: Record<string, number>): string {
  const { weakest } = calculateScoreInsights(scores);
  const suggestions: Record<string, string> = {
    communication: 'Focus on improving verbal pacing. Pausing slightly before answering reduces filler words and keeps messaging clear.',
    technical: 'Dive deeper into key engineering concepts. Supplement your code patterns with architecture details to make answers competitive.',
    confidence: 'Boost confidence by recording mock attempts. Steady tone and calm breathing project confidence under pressure.',
    problemSolving: 'Enhance logical layout. Try tracing algorithm steps verbally as you think to demonstrate step-by-step logic.',
    structure: 'Use STAR structure in behavioral prompts. State Situation, Task, Action, and Result clearly to avoid rambling.',
  };
  return suggestions[weakest.key] || 'Maintain structural discipline and target consistency across behavioral mock prep targets.';
}

// Iteration 5 Helpers
export function calculatePercentile(score: number): number {
  // Empirical interpolation points matching user expectations:
  // - 91 -> 12
  // - 89 -> 18
  // - 83 -> 31
  const points = [
    { s: 100, p: 1 },
    { s: 95, p: 6 },
    { s: 91, p: 12 },
    { s: 89, p: 18 },
    { s: 83, p: 31 },
    { s: 75, p: 45 },
    { s: 60, p: 65 },
    { s: 40, p: 85 },
    { s: 0, p: 99 },
  ];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (score <= p1.s && score >= p2.s) {
      const ratio = (score - p2.s) / (p1.s - p2.s);
      return Math.max(1, Math.min(99, Math.round(p2.p + ratio * (p1.p - p2.p))));
    }
  }
  return 99;
}

export function generateReadinessDescription(
  scores: Record<string, number>,
  stats?: { role: string; company?: string }
): string {
  const { strongest, weakest } = calculateScoreInsights(scores);
  const roleName = ((stats && stats.role) || 'Frontend Engineer').toLowerCase();
  
  let weakestTopic = weakest.name.toLowerCase();
  if (weakest.key === 'technical') {
    if (roleName.includes('frontend')) {
      weakestTopic = 'frontend architecture';
    } else if (roleName.includes('backend')) {
      weakestTopic = 'backend architecture';
    } else {
      weakestTopic = 'technical depth';
    }
  } else if (weakest.key === 'structure') {
    weakestTopic = 'behavioral answer structuring';
  } else if (weakest.key === 'communication') {
    weakestTopic = 'communication delivery';
  } else if (weakest.key === 'confidence') {
    weakestTopic = 'delivery confidence under pressure';
  } else if (weakest.key === 'problemSolving') {
    weakestTopic = 'problem solving and logic breakdown';
  }

  return `Your ${strongest.name.toLowerCase()} is already interview ready. The biggest opportunity is improving ${weakestTopic} explanations.`;
}

export interface GamifiedActionItem {
  text: string;
  scoreGain: number;
}

export function generateGamifiedImprovements(actionItems?: string[]): GamifiedActionItem[] {
  if (!actionItems) return [];
  const gains = [5, 3, 2];
  return actionItems.slice(0, 3).map((item, idx) => ({
    text: item,
    scoreGain: gains[idx] || 1,
  }));
}
