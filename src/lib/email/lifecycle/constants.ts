/** Verified Resend sender for lifecycle transactional mail. */
export const LIFECYCLE_FROM =
  process.env.SENDER_EMAIL_TRANSACTIONAL?.trim() ||
  'InterviewEra <transactional@interviewera.com>';

export const LIFECYCLE_REPLY_TO =
  process.env.SENDER_EMAIL_REPLY_TO?.trim() || 'support@interviewera.com';

export type LifecycleTemplateName =
  | 'verification'
  | 'welcome'
  | 'interview_completed'
  | 'interview_recovery'
  | 'weekly_progress';
