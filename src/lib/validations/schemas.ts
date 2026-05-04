import { z } from 'zod';
import { INTERVIEWER_IDS } from '@/lib/config/interviewers';

export const resumeUploadSchema = z.object({
  userId: z.string().uuid(),
});

export const interviewStartSchema = z.object({
  resumeId: z.string().uuid(),
  role: z.string().min(1).max(100),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  interviewerId: z.enum(INTERVIEWER_IDS),
  // Optional: client sends question count from feature defaults / env (clamped client-side and server-side).
  // Clamped server-side to [4, 10] before use.
  questionCount: z.number().int().min(4).max(10).optional(),
  // Optional: Pro feature — use a pre-built domain pack instead of AI-generated questions
  domainPackId: z.string().uuid().optional(),
});

export const interviewAnswerSchema = z.object({
  interviewId: z.string().uuid(),
  questionId: z.string().uuid(),
  answerText: z.string().min(1).max(5000),
  answerMode: z.enum(['text', 'voice']).optional(),
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

// referredUserId is obtained from the authenticated session server-side, not from the request body
export const referralApplySchema = z.object({
  referralCode: z.string().min(1),
});
