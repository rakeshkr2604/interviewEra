import { z } from 'zod';
import { safeText } from '@/lib/utils/sanitize';

export const LIKED_ASPECT_OPTIONS = [
  'Questions matched my resume/experience',
  'Follow-up questions felt relevant',
  'Voice interview felt realistic',
  'Feedback/scoring was useful',
  'Interview difficulty felt appropriate',
  'Other',
] as const;

export const ISSUE_TYPE_OPTIONS = [
  'No issues',
  'Mic/audio issue',
  'Camera/video issue',
  'Interview froze/stuck',
  'Question/follow-up issue',
  'Resume-related issue',
  'Technical error',
  'Other',
] as const;

export type LikedAspectOption = (typeof LIKED_ASPECT_OPTIONS)[number];
export type IssueTypeOption = (typeof ISSUE_TYPE_OPTIONS)[number];

export const interviewFeedbackSubmitSchema = z.object({
  interviewId: z
    .string()
    .uuid('Invalid interview ID.'),
  rating: z
    .number()
    .int('Rating must be a whole number.')
    .min(1, 'Rating must be at least 1 star.')
    .max(5, 'Rating cannot exceed 5 stars.'),
  likedAspect: z
    .string()
    .trim()
    .max(200, 'Liked aspect must be under 200 characters.')
    .transform((s) => safeText(s, 200))
    .optional()
    .default(''),
  issueType: z
    .string()
    .trim()
    .max(200, 'Issue type must be under 200 characters.')
    .transform((s) => safeText(s, 200))
    .optional()
    .default(''),
  comment: z
    .string()
    .trim()
    .max(2000, 'Comment must be under 2000 characters.')
    .transform((s) => safeText(s, 2000))
    .optional()
    .default(''),
  deviceInfo: z.record(z.string(), z.unknown()).optional(),
});

export type InterviewFeedbackSubmitInput = z.infer<typeof interviewFeedbackSubmitSchema>;
