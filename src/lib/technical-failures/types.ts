export const TECHNICAL_FAILURE_CATEGORIES = [
  'server_error',
  'initialization_failure',
  'preparation_failure',
  'platform_timeout',
  'ai_provider_failure',
  'transcription_service_failure',
  'unexpected_interruption',
  'other',
] as const;

export type TechnicalFailureCategory = (typeof TECHNICAL_FAILURE_CATEGORIES)[number];

export const TECHNICAL_FAILURE_CATEGORY_LABELS: Record<TechnicalFailureCategory, string> = {
  server_error: 'Server error',
  initialization_failure: 'Interview failed to start',
  preparation_failure: 'Questions or interview preparation failed',
  platform_timeout: 'InterviewEra timed out or became stuck',
  ai_provider_failure: 'AI interviewer/provider failure',
  transcription_service_failure: 'Transcription or speech service failure',
  unexpected_interruption: 'Unexpected interview interruption',
  other: 'Other technical issue',
};

export type TechnicalFailureStatus =
  | 'submitted'
  | 'investigating'
  | 'approved'
  | 'rejected';

export type FeedbackInterviewOption = {
  id: string;
  role: string;
  difficulty: string;
  status: string;
  engine: string;
  started_at: string | null;
  completed_at: string | null;
};

export type TechnicalFailureCaseView = {
  id: string;
  user_id: string;
  interview_id: string;
  feedback_id: string;
  failure_category: TechnicalFailureCategory;
  status: TechnicalFailureStatus;
  original_debit_transaction_id: string | null;
  restoration_transaction_id: string | null;
  service_recovery_transaction_id: string | null;
  submitted_at: string;
  review_started_at: string | null;
  resolved_at: string | null;
  restored_at: string | null;
  service_recovery_granted_at: string | null;
  reviewed_by_email: string | null;
  decision_reason: string | null;
  service_recovery_reason: string | null;
  interview: {
    role: string;
    difficulty: string;
    status: string;
    engine: string;
    started_at: string | null;
    completed_at: string | null;
    credit_deducted: boolean;
  } | null;
  original_debit: {
    id: string;
    amount: number;
    reason: string | null;
    created_at: string;
  } | null;
};
