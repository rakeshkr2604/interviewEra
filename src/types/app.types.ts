import type { InterviewGoal } from '@/types/onboarding.types';

// ─── Enum-like types ──────────────────────────────────────────────────────────

export type PlanTier = 'free' | 'starter' | 'pro' | 'campus' | 'campus_admin';

export type InterviewStatus = 'pending' | 'in_progress' | 'completed' | 'abandoned';

export type ResumeStatus = 'uploading' | 'parsing' | 'parsed' | 'failed';

export type AnswerMode = 'text' | 'voice';

export type CreditType = 'debit' | 'credit';

export type ReferralStatus = 'pending' | 'completed' | 'credited';

export type InterviewDifficulty = 'easy' | 'medium' | 'hard';

export type QuestionCategory = 'technical' | 'behavioral' | 'situational';

export type DomainPackDomain = 'dsa' | 'system_design' | 'hr';

/** Stored on interviews.session_context — mirrors validated interview start payload */
export interface InterviewSessionContext {
  goal: InterviewGoal;
  interviewMode: 'technical' | 'hr_behavioral' | 'mixed';
  experienceYears: number;
  interviewerId: 'priya' | 'arjun';
  /** Optional employer JD text used only for question personalization */
  jobDescription?: string;
}

export interface DomainPack {
  id: string;
  name: string;
  domain: DomainPackDomain;
  description: string | null;
  question_count: number | null;
  is_active: boolean;
}

// ─── Core entities ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  plan_tier: PlanTier;
  credits_remaining: number;
  placement_date: string | null;
  created_at: string;
}

export interface ParsedResumeExperience {
  company: string;
  role: string;
  duration: string;
  description: string;
}

export interface ParsedResumeProject {
  name: string;
  tech_stack: string[];
  description: string;
}

export interface ParsedResumeEducation {
  degree: string;
  institution: string;
  year: string;
  cgpa: string;
}

export interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: ParsedResumeExperience[];
  projects: ParsedResumeProject[];
  education: ParsedResumeEducation[];
  target_roles: string[];
}

/** Structured JD used for interview personalization (mirrors resume-style parsing). */
export interface ParsedJobDescription {
  role_title: string;
  company_employer: string;
  location: string;
  employment_type: string;
  about_role: string;
  responsibilities: string[];
  requirements: string[];
  must_have: string[];
  nice_to_have: string[];
  skills_keywords: string[];
  education_eligibility: string[];
  compensation_notes: string;
}

export interface Resume {
  id: string;
  user_id: string;
  file_url: string | null;
  raw_text: string | null;
  parsed_data: ParsedResume | null;
  status: ResumeStatus;
  created_at: string;
}

export interface Interview {
  id: string;
  user_id: string;
  resume_id: string;
  interviewer_id: 'priya' | 'arjun';
  role: string;
  difficulty: InterviewDifficulty;
  question_count: number;
  status: InterviewStatus;
  started_at: string | null;
  completed_at: string | null;
  session_context: InterviewSessionContext;
}

export interface QuestionRubric {
  ideal_keywords: string[];
  ideal_structure: string;
  red_flags: string[];
}

export interface Question {
  id: string;
  interview_id: string;
  order_index: number;
  question_text: string;
  rubric: QuestionRubric;
  category: QuestionCategory;
}

export interface Answer {
  id: string;
  question_id: string;
  answer_text: string;
  answer_mode: AnswerMode;
  submitted_at: string;
}

export interface DimensionScores {
  communication_clarity: number;
  technical_depth: number;
  answer_structure: number;
  confidence: number;
  relevance: number;
}

/** Per-answer score rationale returned by AI evaluation (stored inside `detailed_analysis` JSONB). */
export interface ScoreJustification {
  why_this_score: string;
  key_strengths: string[];
  improvement_areas: string[];
}

export interface DetailedAnalysis {
  strengths: string[];
  improvements: string[];
  model_answer_hint: string;
  keywords_missing: string[];
  score_justification?: ScoreJustification;
}

export interface Evaluation {
  id: string;
  answer_id: string;
  overall_score: number;
  dimension_scores: DimensionScores;
  feedback_text: string;
  detailed_analysis: DetailedAnalysis;
}

/** Spider rows: `dimension` matches keys of DimensionScores (string). Trend series: labels like Interview 1. */
export interface RadarDataPoint {
  dimension: string;
  score: number;
}

export interface ReportSpeechSummary {
  total_filler_count: number;
  total_duration_seconds: number;
  rate_per_minute: number;
  severity: 'safe' | 'warning' | 'severe';
  message: string;
  /** Fillers as a percentage of total words spoken */
  percentage: number;
  top_fillers: { word: string; occurrences: number }[];
  answers_with_metrics: number;
  total_answers: number;
  /** 'stored' = all exact durations used; 'partial' = mix; 'estimated' = all 130wpm fallback */
  source: 'stored' | 'partial' | 'estimated';
}

// ─── Report intelligence types ────────────────────────────────────────────────

export type SignalStrength = 'strong' | 'moderate' | 'weak';
export type HiringSignal   = 'hire' | 'borderline' | 'reject';
export type ReadinessLevel = 'ready' | 'developing' | 'early_stage';

export interface ReportInsights {
  executive_summary: {
    narrative: string;
    hiring_signal: HiringSignal;
    readiness_level: ReadinessLevel;
    role_fit_confidence: number;
    strongest_dimension: string;
    weakest_dimension: string;
  };
  hiring_signals: {
    technical_ownership: SignalStrength;
    communication_clarity: SignalStrength;
    problem_solving: SignalStrength;
    confidence_under_pressure: SignalStrength;
    answer_structure: SignalStrength;
    relevance: SignalStrength;
  };
  behavioral_patterns: string[];
  communication: {
    strengths: string[];
    weaknesses: string[];
    clarity_narrative: string;
    confidence_progression: string;
  };
  technical: {
    depth_assessment: string;
    weak_patterns: string[];
    strength_patterns: string[];
  };
  benchmarking: {
    percentile_estimate: number;
    comparison_narrative: string;
    role_calibration: string;
  };
  improvement_roadmap: {
    week_1: string[];
    month_1: string[];
    focus_areas: string[];
  };
}

export interface ReportSummary {
  speech: ReportSpeechSummary;
  /** AI insight dossier — computed from per-answer evaluations at report creation time. */
  insights?: ReportInsights;
}

export interface Report {
  id: string;
  interview_id: string;
  overall_score: number;
  radar_data: RadarDataPoint[];
  trend_data: RadarDataPoint[] | null;
  summary: ReportSummary | null;
  generated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanTier;
  razorpay_sub_id: string | null;
  status: 'active' | 'cancelled' | 'past_due';
  current_period_start: string | null;
  current_period_end: string | null;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: ReferralStatus;
  credited_at: string | null;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: CreditType;
  amount: number;
  reason: string | null;
  created_at: string;
}

// ─── Campus Admin types ───────────────────────────────────────────────────────

export interface CampusOrganization {
  id: string;
  name: string;
  admin_user_id: string | null;
  seat_count: number;
  plan_start: string | null;
  plan_end: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
}

export type CampusInviteStatus = 'pending' | 'accepted';

export interface CampusInvite {
  id: string;
  org_id: string;
  email: string;
  token: string;
  status: CampusInviteStatus;
  invited_at: string;
  accepted_at: string | null;
}

export interface CampusStudentRow {
  id: string;
  email: string;
  name: string | null;
  interviews_completed: number;
  avg_score: number | null;
  last_interview_at: string | null;
}
