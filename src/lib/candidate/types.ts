import type { DimensionScores, ParsedResume, ResumeStatus } from '@/types/app.types';
import type { UserProgressRow } from '@/lib/retention/types';

export type ReadinessCategoryKey =
  | 'resume_quality'
  | 'interview_performance'
  | 'communication'
  | 'technical_depth'
  | 'consistency';

export interface ReadinessCategoryScore {
  key: ReadinessCategoryKey;
  label: string;
  score: number;
  maxScore: number;
  summary: string;
}

export interface ReadinessScoreResult {
  overall: number;
  level: 'early_stage' | 'developing' | 'ready';
  categories: ReadinessCategoryScore[];
  improvementTrend: 'improving' | 'steady' | 'declining' | 'insufficient_data';
  trendLabel: string;
  computedAt: string;
}

export interface RoadmapInterviewRecommendation {
  id: string;
  title: string;
  description: string;
  href: string;
  difficulty: 'easy' | 'medium' | 'hard';
  reason: string;
}

export interface RoadmapTopicRecommendation {
  id: string;
  title: string;
  description: string;
  dimension: keyof DimensionScores;
  priority: 'high' | 'medium' | 'low';
}

export interface RoadmapQuestionRecommendation {
  id: string;
  question: string;
  category: 'technical' | 'behavioral' | 'situational';
  dimension: keyof DimensionScores;
}

export interface RoadmapToolRecommendation {
  id: string;
  title: string;
  description: string;
  href: string;
}

export interface PersonalizedRoadmap {
  targetRole: string;
  weakDimensions: (keyof DimensionScores)[];
  recommendedInterviews: RoadmapInterviewRecommendation[];
  recommendedTopics: RoadmapTopicRecommendation[];
  suggestedQuestions: RoadmapQuestionRecommendation[];
  suggestedTools: RoadmapToolRecommendation[];
  generatedAt: string;
}

export type CandidateNotificationType =
  | 'interview_reminder'
  | 'resume_parsed'
  | 'report_ready'
  | 'invite_accepted'
  | 'practice_streak';

export interface CandidateNotification {
  id: string;
  type: CandidateNotificationType;
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
  read: boolean;
}

export interface CandidateProfileFields {
  preferredRole: string;
  graduationYear: number | null;
  collegeName: string;
  experienceLevel: 'fresher' | 'junior' | 'mid' | 'senior';
  /** Optional Phase-2 additions (QG preference profile) — absent on older rows. */
  degree?: string;
  targetRoles?: string[];
  targetCompanies?: string[];
}

export interface ResumeSnapshot {
  id: string;
  status: ResumeStatus;
  createdAt: string;
  /**
   * @deprecated Always null in Phase 2.5+. Use GET /api/resume/:id/file for downloads.
   * Durable public Storage URLs must not drive product behavior.
   */
  fileUrl: string | null;
  parsed: ParsedResume | null;
  parseQuality: string | null;
  parseWarning: string | null;
}

export interface ReportDimensionAverages {
  communication_clarity: number | null;
  technical_depth: number | null;
  answer_structure: number | null;
  confidence: number | null;
  relevance: number | null;
}

export interface CandidateSnapshot {
  userId: string;
  targetRole: string;
  profile: CandidateProfileFields;
  latestResume: ResumeSnapshot | null;
  resumeCompletionPct: number;
  progress: UserProgressRow | null;
  completedSessionCount: number;
  inProgressInterviewId: string | null;
  inProgressInterviewRole: string | null;
  dimensionAverages: ReportDimensionAverages;
  recentReportIds: string[];
  collegeEnrollmentAccepted: boolean;
  collegeName: string | null;
}
