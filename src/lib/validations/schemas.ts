import { z } from 'zod';
import { INTERVIEWER_IDS } from '@/lib/config/interviewers';
import { TECHNICAL_FAILURE_CATEGORIES } from '@/lib/technical-failures/types';
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

/**
 * Phone number collected at onboarding. Loose on purpose — international
 * formats vary and this is a contact field, not a login credential — but
 * catches obvious garbage. Accepts an optional leading `+`, 7–15 digits
 * total (E.164 range), with spaces/hyphens stripped before the digit count.
 */
export const phoneNumberSchema = z
  .string()
  .trim()
  .min(1, 'Enter your phone number.')
  .max(20, 'Phone number is too long.')
  .regex(/^\+?[0-9\s-]{7,20}$/, 'Enter a valid phone number.')
  .refine((v) => v.replace(/[^0-9]/g, '').length >= 7, 'Enter a valid phone number.');

/** Shared auth password policy so campus clients cannot drift from the signup API. */
export const authPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[0-9]/, 'Password must include a number.')
  .regex(/[^A-Za-z0-9\s]/, 'Password must include a special character.');

export const resumeUploadSchema = z.object({
  userId: z.string().uuid(),
});

export const INTERVIEW_GOAL_IDS = [
  'fresher_placement',
  'job_switch',
  'promotion_prep',
  'general_practice',
] as const satisfies readonly InterviewGoal[];

/** Accepts trimmed resume id plus numeric fields that may arrive as null (JSON serialization of NaN). */
export const interviewStartSchema = z.object({
  resumeId: z.preprocess((v) => (typeof v === 'string' ? v.trim() : v), z.string().uuid()),
  role: z
    .string()
    .min(1)
    .max(100)
    .transform((s) => safeText(s, 100))
    .refine((s) => s.length >= 1, 'Role is required.'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  interviewerId: z.enum(INTERVIEWER_IDS),
  goal: z.enum(INTERVIEW_GOAL_IDS).optional().default('general_practice'),
  interviewMode: z
    .enum(['technical', 'hr_behavioral', 'mixed'])
    .optional()
    .default('technical'),
  experienceYears: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return undefined;
      if (typeof val === 'number') {
        if (!Number.isFinite(val)) return undefined;
        return Math.trunc(val);
      }
      if (typeof val === 'string') {
        const n = Number.parseInt(val.trim(), 10);
        return Number.isFinite(n) ? n : undefined;
      }
      return undefined;
    },
    z.number().int().min(0).max(60).optional().default(0),
  ),
  // Optional: client sends question count from feature defaults / env (clamped client-side and server-side).
  // Clamped server-side to [4, 10] before use.
  questionCount: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return undefined;
      if (typeof val === 'number') {
        if (!Number.isFinite(val)) return undefined;
        return Math.trunc(val);
      }
      if (typeof val === 'string') {
        const n = Number.parseInt(String(val).trim(), 10);
        return Number.isFinite(n) ? n : undefined;
      }
      return undefined;
    },
    z.number().int().min(4).max(10).optional(),
  ),
  // Optional: Pro feature — use a pre-built domain pack instead of AI-generated questions
  domainPackId: z.string().uuid().optional(),
  // Optional: pasted employer JD — used only for question personalization (max 12k chars server-side).
  // Preprocess rejects non-text payloads (bad clients / mistaken objects) instead of failing the whole request.
  jobDescription: z
    .preprocess((raw) => {
      if (raw === null || raw === undefined || raw === '') return undefined;
      if (typeof raw === 'string') return raw;
      if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
      return undefined;
    }, z.string().max(12000).optional())
    .transform((val) => {
      if (val == null || val === '') return undefined;
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
  /** Wall-clock seconds from TTS-complete to submit. Used server-side to compute speech_metrics. */
  durationSeconds: z.number().int().nonnegative().max(7200).optional(),
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
  code: z
    .string()
    .max(64)
    .optional()
    .transform((s) => (s ? s.trim().toUpperCase() : undefined)),
});

export const paymentPreviewDiscountSchema = z.object({
  plan: z.enum(['starter', 'pro']),
  code: z
    .string()
    .min(1)
    .max(64)
    .transform((s) => s.trim().toUpperCase()),
  coupon_attempt_id: z.string().uuid().optional(),
});

export const paymentVerifySchema = z.object({
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

/** PATCH /api/account/profile — name and/or phone, both optional but at least one required. */
export const accountProfilePatchSchema = z
  .object({
    name: displayNameSchema.optional(),
    phoneNumber: phoneNumberSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.phoneNumber !== undefined, {
    message: 'Nothing to update.',
  })

/**
 * In-app feedback submission. user_id/email come from the authenticated session
 * server-side; `name` is editable in the form (prefilled from the profile).
 * All free-text is HTML-stripped + length-clamped here so the DB and email never
 * see raw markup — never trust the frontend's own limits.
 */
const feedbackText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v : ''),
    z
      .string()
      .max(max * 2) // generous pre-sanitize ceiling; safeText does the real clamp
      .transform((s) => safeText(s, max)),
  )

/** Overall star rating: 1–5 in half-star steps (1, 1.5, …, 5). */
export const halfStarRatingSchema = z.coerce
  .number()
  .min(1, 'Pick a rating.')
  .max(5)
  .refine((n) => Number.isFinite(n) && Math.round(n * 2) === n * 2, {
    message: 'Rating must be a whole or half star.',
  })

export const feedbackSubmitSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required.')
    .max(160)
    .transform((s) => safeText(s, 80))
    .refine((s) => s.length >= 1, 'Name is required.'),
  rating: z.preprocess(
    (value) => (value === null || value === undefined || value === '' ? null : value),
    z.union([halfStarRatingSchema, z.null()]).default(null),
  ),
  likedText: feedbackText(2000),
  confusionText: feedbackText(2000),
  bugsText: feedbackText(2000),
  wouldUseAgain: z.boolean().nullable().optional().default(null),
  /** Opt-in only — never required; default false when omitted. */
  consentPublicDisplay: z.boolean().optional().default(false),
  npsScore: z.coerce.number().int().min(0).max(10).nullable().optional().default(null),
  feedbackCategory: z
    .enum(['general', 'bug', 'feature', 'interview', 'report', 'ai_quality', 'technical_issue'])
    .optional()
    .default('general'),
  interviewId: z.string().uuid().optional(),
  technicalFailureCategory: z.enum(TECHNICAL_FAILURE_CATEGORIES).optional(),
  technicalIssueDescription: z
    .string()
    .max(2000)
    .transform((s) => safeText(s, 2000))
    .optional(),
  pageUrl: z
    .preprocess((v) => (typeof v === 'string' ? v : ''), z.string().max(2048))
    .transform((s) => safeText(s, 2048)),
  browserInfo: z
    .preprocess((v) => (typeof v === 'string' ? v : ''), z.string().max(1024))
    .transform((s) => safeText(s, 512)),
  // Storage object path of an already-uploaded screenshot (feedback/{userId}/...).
  // Ownership is re-verified server-side against the session before use.
  screenshotPath: z
    .string()
    .max(512)
    .regex(/^feedback\/[^/]+\/[^/]+$/, 'Invalid screenshot reference.')
    .optional(),
  // Technical context collected client-side: browser, device, interview session.
  // Optional — older clients or ad-blockers may not send it; API handles absence gracefully.
  sessionContext: z
    .object({
      session_id: z.string().max(200).nullable().optional(),
      interview_role: z.string().max(200).nullable().optional(),
      interview_type: z.string().max(100).nullable().optional(),
      difficulty_level: z.string().max(50).nullable().optional(),
      interview_duration_seconds: z.number().int().nonnegative().max(86400).nullable().optional(),
      current_page: z.string().max(2048).optional(),
      browser_name: z.string().max(100).optional(),
      os: z.string().max(100).optional(),
      device_type: z.enum(['mobile', 'tablet', 'desktop']).optional(),
      screen_size: z.string().max(20).optional(),
      network_type: z.string().max(50).nullable().optional(),
      mic_permission_status: z.string().max(20).optional(),
      camera_permission_status: z.string().max(20).optional(),
      speech_recognition_supported: z.boolean().optional(),
      speech_recognition_enabled: z.boolean().optional(),
    })
    .optional(),
}).superRefine((value, ctx) => {
  if (value.feedbackCategory !== 'technical_issue') {
    if (value.rating === null) {
      ctx.addIssue({
        code: 'custom',
        path: ['rating'],
        message: 'Pick a rating.',
      });
    }
    return;
  }

  if (!value.interviewId) {
    ctx.addIssue({
      code: 'custom',
      path: ['interviewId'],
      message: 'Select the affected interview.',
    });
  }
  if (!value.technicalFailureCategory) {
    ctx.addIssue({
      code: 'custom',
      path: ['technicalFailureCategory'],
      message: 'Select the technical issue type.',
    });
  }
  if (!value.technicalIssueDescription?.trim()) {
    ctx.addIssue({
      code: 'custom',
      path: ['technicalIssueDescription'],
      message: 'Describe what happened during the interview.',
    });
  }
})

export type FeedbackSubmitInput = z.infer<typeof feedbackSubmitSchema>;
