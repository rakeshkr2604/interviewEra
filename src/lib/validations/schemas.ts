import { z } from 'zod';
import { INTERVIEWER_IDS } from '@/lib/config/interviewers';
import type { InterviewGoal } from '@/types/onboarding.types';
import { safeText } from '@/lib/utils/sanitize';

/** Strict display name (auth + public.users.name). ASCII letters, spaces, apostrophe, hyphen. */
export const displayNameSchema = z
  .string()
  .trim()
  .regex(
    /^[a-zA-Z\s'-]{2,50}$/,
    'Name must be 2–50 characters (letters, spaces, apostrophes, or hyphens only).',
  );

export const resumeUploadSchema = z.object({
  userId: z.string().uuid(),
});

export const INTERVIEW_GOAL_IDS = [
  'fresher_placement',
  'job_switch',
  'promotion_prep',
  'general_practice',
] as const satisfies readonly InterviewGoal[];

export const interviewStartSchema = z.object({
  resumeId: z.string().uuid(),
  role: z
    .string()
    .min(1)
    .max(100)
    .transform((s) => safeText(s, 100))
    .refine((s) => s.length >= 1, 'Role is required.'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  interviewerId: z.enum(INTERVIEWER_IDS),
  goal: z.enum(INTERVIEW_GOAL_IDS).optional().default('general_practice'),
  interviewMode: z.enum(['technical', 'hr_behavioral']).optional().default('technical'),
  experienceYears: z.number().int().min(0).max(60).optional().default(0),
  // Optional: client sends question count from feature defaults / env (clamped client-side and server-side).
  // Clamped server-side to [4, 10] before use.
  questionCount: z.number().int().min(4).max(10).optional(),
  // Optional: Pro feature — use a pre-built domain pack instead of AI-generated questions
  domainPackId: z.string().uuid().optional(),
  // Optional: pasted employer JD — used only for question personalization (max 12k chars server-side).
  jobDescription: z
    .union([z.undefined(), z.null(), z.string().max(12000)])
    .transform((val) => {
      if (val == null) return undefined;
      const t = safeText(val, 12000);
      return t === '' ? undefined : t;
    }),
});

export const interviewAnswerSchema = z.object({
  interviewId: z.string().uuid(),
  questionId: z.string().uuid(),
  answerText: z
    .string()
    .max(5000)
    .transform((s) => safeText(s, 5000))
    .refine((s) => s.length >= 1, 'Answer cannot be empty.'),
  answerMode: z.enum(['text', 'voice']).optional(),
  /** Matches Settings → Interview → answer style (localStorage). Optional for older clients. */
  answerStyle: z.enum(['concise', 'balanced', 'detailed']).optional(),
});

export const interviewCompleteSchema = z.object({
  interviewId: z.string().uuid(),
});

export const reportGenerateSchema = z.object({
  interviewId: z.string().uuid(),
});

// userId is obtained from the authenticated session server-side, not from the request body
export const paymentCreateOrderSchema = z.object({
  plan: z.enum(['starter', 'pro', 'campus']),
  billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
});

/** Standard Razorpay order (one-time payment). Amount is in paise (min 100). */
export const standardOrderCreateSchema = z.object({
  amount: z.number().int().min(100),
  currency: z.string().min(3).max(3).default('INR'),
  receipt: z.string().min(1).max(40).optional(),
});

export const standardPaymentVerifySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

// referredUserId is obtained from the authenticated session server-side, not from the request body
export const referralApplySchema = z.object({
  referralCode: z
    .string()
    .min(1)
    .max(80)
    .transform((s) => safeText(s, 80)),
});

export const profileNamePatchSchema = z.object({
  name: displayNameSchema,
});
