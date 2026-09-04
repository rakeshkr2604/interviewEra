import { z } from 'zod';
import { safeText } from '@/lib/utils/sanitize';

export const EXIT_REASON_OPTIONS = [
  'I need to leave for a personal reason',
  'I ran into a technical problem',
  "The interview wasn't working as expected",
  'The questions were too difficult',
  "The questions weren't relevant to me",
  'I was confused about what to do',
  'The interview was taking too long',
  "I didn't find the interview useful",
  "I wasn't satisfied with the experience",
  'I started the interview by mistake',
  'Other',
] as const;

export const TECHNICAL_ISSUE_OPTIONS = [
  'Mic/audio problem',
  'Camera/video problem',
  'Interview froze/stuck',
  'Voice recognition problem',
  'AI/response problem',
  "Page didn't load/work correctly",
  'Network problem',
  'Other technical issue',
] as const;

export type ExitReasonOption = (typeof EXIT_REASON_OPTIONS)[number];
export type TechnicalIssueOption = (typeof TECHNICAL_ISSUE_OPTIONS)[number];

export const interviewExitFeedbackSubmitSchema = z.object({
  interviewId: z
    .string()
    .uuid('Invalid interview ID.'),
  exitReason: z
    .string()
    .trim()
    .min(1, 'Please select an exit reason.')
    .max(200, 'Exit reason must be under 200 characters.')
    .transform((s) => safeText(s, 200)),
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
    .max(1000, 'Comment must be under 1000 characters.')
    .transform((s) => safeText(s, 1000))
    .optional()
    .default(''),
  questionIndex: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .nullable(),
  progressPercent: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional()
    .nullable(),
  engine: z
    .string()
    .trim()
    .max(50)
    .optional()
    .default('script'),
  deviceInfo: z.record(z.string(), z.unknown()).optional(),
});

export type InterviewExitFeedbackSubmitInput = z.infer<typeof interviewExitFeedbackSubmitSchema>;
