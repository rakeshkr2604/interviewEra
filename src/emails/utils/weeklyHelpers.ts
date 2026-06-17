export interface WeeklyDimensionScores {
  communication: { current: number; previous: number };
  technical: { current: number; previous: number };
  confidence: { current: number; previous: number };
  problemSolving: { current: number; previous: number };
  structure: { current: number; previous: number };
}

export interface WeeklyTrendDetails {
  delta: number;
  formatted: string;
  color: string;
  arrow: string;
}

export function generateTrend(current: number, previous: number): WeeklyTrendDetails {
  const delta = current - previous;
  if (delta > 0) {
    return { delta, formatted: `+${delta}`, color: '#16a34a', arrow: '↑' };
  } else if (delta < 0) {
    return { delta, formatted: `${delta}`, color: '#dc2626', arrow: '↓' };
  }
  return { delta, formatted: '0', color: '#71717a', arrow: '→' };
}

export function generateWeeklySummary(current: number, previous: number): string {
  const delta = current - previous;
  if (delta > 0) {
    return `Your overall readiness score improved by ${delta} points this week! Great job keeping up the practice momentum.`;
  } else if (delta < 0) {
    return `Your score dipped by ${Math.abs(delta)} points this week. Focus on structured preparation to regain ground.`;
  }
  return `Your overall readiness remained steady at ${current} this week. Try taking another mock interview to test your skills!`;
}

export function generateStrongestArea(dimensions: WeeklyDimensionScores) {
  const keys = Object.keys(dimensions) as Array<keyof WeeklyDimensionScores>;
  let strongestKey = keys[0];
  let maxScore = dimensions[strongestKey].current;

  keys.forEach((key) => {
    if (dimensions[key].current > maxScore) {
      strongestKey = key;
      maxScore = dimensions[key].current;
    }
  });

  const delta = dimensions[strongestKey].current - dimensions[strongestKey].previous;
  const labels: Record<keyof WeeklyDimensionScores, string> = {
    communication: 'Communication',
    technical: 'Technical Depth',
    confidence: 'Confidence',
    problemSolving: 'Problem Solving',
    structure: 'Answer Structure',
  };

  return {
    key: strongestKey,
    name: labels[strongestKey],
    score: maxScore,
    delta: delta,
    formattedDelta: delta >= 0 ? `+${delta}` : `${delta}`,
  };
}

export function generateWeakestArea(dimensions: WeeklyDimensionScores) {
  const keys = Object.keys(dimensions) as Array<keyof WeeklyDimensionScores>;
  let weakestKey = keys[0];
  let minScore = dimensions[weakestKey].current;

  keys.forEach((key) => {
    if (dimensions[key].current < minScore) {
      weakestKey = key;
      minScore = dimensions[key].current;
    }
  });

  const labels: Record<keyof WeeklyDimensionScores, string> = {
    communication: 'Communication',
    technical: 'Technical Depth',
    confidence: 'Confidence',
    problemSolving: 'Problem Solving',
    structure: 'Answer Structure',
  };

  const suggestions: Record<keyof WeeklyDimensionScores, string> = {
    communication: 'Focus on verbal pacing and pausing before answers to reduce filler words.',
    technical: 'Structure explanations to detail system architecture choices and trade-offs.',
    confidence: 'Project control by keeping steady vocal tones and taking calm breaths.',
    problemSolving: 'State your assumptions and talk through your logical steps step-by-step.',
    structure: 'Adopt the STAR framework (Situation, Task, Action, Result) for behavioral answers.',
  };

  return {
    key: weakestKey,
    name: labels[weakestKey],
    score: minScore,
    suggestion: suggestions[weakestKey],
  };
}

export function generateCoachMessage(
  dimensions: WeeklyDimensionScores,
  currentWeekScore: number
): string {
  const strongest = generateStrongestArea(dimensions);
  const weakest = generateWeakestArea(dimensions);

  return `Your ${strongest.name.toLowerCase()} shows solid improvement (${strongest.formattedDelta} pts). However, ${weakest.name.toLowerCase()} remains a blocker at ${weakest.score}. Next week, focus on backend coding structure to push your overall score above ${Math.min(95, currentWeekScore + 5)}.`;
}

export function generateAchievementBadges(
  dimensions: WeeklyDimensionScores,
  streak: number,
  leaderboardPercentile?: number
): string[] {
  const badges: string[] = [];
  
  if (dimensions.communication.current >= 90) badges.push('🏅 Excellent Communicator');
  if (dimensions.technical.current >= 90) badges.push('🏅 Technical Master');
  if (dimensions.confidence.current >= 90) badges.push('🏅 Confident Speaker');
  if (dimensions.problemSolving.current >= 90) badges.push('🏅 Problem Solver');
  if (dimensions.structure.current >= 90) badges.push('🏅 STAR Expert');

  if (streak >= 5) {
    badges.push(`🔥 ${streak} Interview Streak`);
  }
  
  if (leaderboardPercentile && leaderboardPercentile <= 20) {
    badges.push(`⭐ Top ${leaderboardPercentile}%`);
  }
  
  if (badges.length === 0) {
    badges.push('🚀 Active Practitioner');
  }

  return badges;
}

export interface WeeklyRecommendationDetails {
  role: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  expectedScoreGain: string;
  url: string;
}

export function generateRecommendation(
  dimensions: WeeklyDimensionScores,
  targetRole: string
): WeeklyRecommendationDetails {
  const weakest = generateWeakestArea(dimensions);
  const isFrontend = targetRole.toLowerCase().includes('frontend');
  const isBackend = targetRole.toLowerCase().includes('backend');

  let role = 'System Design mock';
  let difficulty: 'Beginner' | 'Intermediate' | 'Advanced' = 'Intermediate';
  let estimatedMinutes = 20;
  let expectedScoreGain = '+5 to +8 overall score';

  if (weakest.key === 'technical') {
    if (isFrontend) {
      role = 'React Frontend Interview';
      estimatedMinutes = 15;
      expectedScoreGain = '+6 to +9 score';
    } else if (isBackend) {
      role = 'Backend SQL Interview';
      estimatedMinutes = 20;
      expectedScoreGain = '+5 to +8 score';
    } else {
      role = 'Technical Mock Interview';
      estimatedMinutes = 20;
      expectedScoreGain = '+5 to +8 score';
    }
  } else if (weakest.key === 'communication') {
    role = 'Communication Practice';
    estimatedMinutes = 15;
    difficulty = 'Beginner';
    expectedScoreGain = '+4 to +7 score';
  } else if (weakest.key === 'confidence') {
    role = 'HR Behaviour Interview';
    estimatedMinutes = 15;
    difficulty = 'Intermediate';
    expectedScoreGain = '+3 to +6 score';
  } else if (weakest.key === 'problemSolving') {
    role = 'DSA Practice';
    estimatedMinutes = 20;
    difficulty = 'Advanced';
    expectedScoreGain = '+5 to +9 score';
  } else if (weakest.key === 'structure') {
    role = 'STAR Behavioural Interview';
    estimatedMinutes = 15;
    difficulty = 'Intermediate';
    expectedScoreGain = '+4 to +8 score';
  }

  return {
    role,
    difficulty,
    estimatedMinutes,
    expectedScoreGain,
    url: `https://interviewera.com/practice/${role.toLowerCase().replace(/\s+/g, '-')}`,
  };
}
