/**
 * Official InterviewEra addresses (Google Workspace aliases on founder@interviewera.com).
 * Override via env for staging only.
 */
export const PRODUCT_UPDATE_FROM =
  process.env.PRODUCT_UPDATE_FROM?.trim() ||
  'Rakesh Kumar, Founder, InterviewEra <founder@interviewera.com>';

export const PRODUCT_UPDATE_REPLY_TO =
  process.env.PRODUCT_UPDATE_REPLY_TO?.trim() || 'founder@interviewera.com';

export const PRODUCT_UPDATE_SUBJECT =
  process.env.PRODUCT_UPDATE_SUBJECT?.trim() ||
  'InterviewEra just got better — your account has been updated';
