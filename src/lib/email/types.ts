export interface EmailPreference {
  userId: string;
  weeklyReports: boolean;
  productUpdates: boolean;
  marketing: boolean;
  achievements: boolean;
  interviewReminders: boolean;
  securityEmails: boolean; // mandatory transactional emails
  unsubscribedAll: boolean;
  updatedAt?: string;
}

export type EmailEventType =
  | 'user.signup'
  | 'user.email_verified'
  | 'resume.uploaded'
  | 'interview.started'
  | 'interview.completed'
  | 'weekly.summary'
  | 'user.inactive.7days'
  | 'user.inactive.14days'
  | 'user.inactive.30days'
  | 'subscription.started'
  | 'subscription.cancelled'
  | 'payment.failed'
  | 'achievement.unlocked'
  | 'goal.completed';

export interface EmailEvent {
  id: string;
  userId?: string;
  eventType: EmailEventType;
  payload: Record<string, unknown>;
  processed: boolean;
  createdAt?: string;
}

export type EmailJobStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'cancelled'
  | 'dlq';

export interface EmailJob {
  id: string;
  eventId?: string;
  userId?: string;
  recipientEmail: string;
  templateName: string;
  status: EmailJobStatus;
  retryCount: number;
  nextAttemptAt: string;
  errorMessage?: string;
  correlationId: string;
  payload: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailLog {
  id: string;
  jobId?: string;
  status: string;
  provider: string;
  errorMessage?: string;
  latencyMs?: number;
  createdAt?: string;
}

export interface EmailMetric {
  id: string;
  templateName: string;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  spamCount: number;
  unsubscribeCount: number;
  updatedAt?: string;
}

export interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  errorMessage?: string;
}
